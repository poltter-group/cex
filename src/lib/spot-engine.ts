import { doc, collection, runTransaction, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function placeSpotOrder(orderRequest: any) {
    const { 
        userId, 
        baseAsset, 
        quoteAsset,
        walletType = 'MAIN',
        side, 
        type, 
        amount, 
        price 
    } = orderRequest;

    if (!userId || !baseAsset || !quoteAsset || !side || !type || !amount) {
        throw new Error('Missing required parameters');
    }

    const userRef = doc(db, 'users', userId);
    const pair = `${baseAsset}/${quoteAsset}`;
    
    const orderAmount = parseFloat(amount);
    const limitPrice = parseFloat(price || '0');

    if (isNaN(orderAmount) || orderAmount <= 0) {
        throw new Error('Invalid amount');
    }

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const profile = userDoc.data()!;
        
        const quoteKey = `wallets.${walletType}.${quoteAsset}`;
        const baseKey = `wallets.${walletType}.${baseAsset}`;
        const quoteLockedKey = `locked.${walletType}.${quoteAsset}`;
        const baseLockedKey = `locked.${walletType}.${baseAsset}`;

        let quoteBalance = profile.wallets?.[walletType]?.[quoteAsset] ?? 0;
        let baseBalance = profile.wallets?.[walletType]?.[baseAsset] ?? 0;
        if (walletType === 'MAIN') {
            if (quoteBalance === 0) quoteBalance = (quoteAsset === 'USD' ? profile.balanceUSD : profile.balanceUSDT) || 0;
            if (baseBalance === 0) baseBalance = profile[`balance${baseAsset}`] || 0;
        }

        const currentQuoteLocked = profile.locked?.[walletType]?.[quoteAsset] || 0;
        const currentBaseLocked = profile.locked?.[walletType]?.[baseAsset] || 0;

        if (type === 'Limit') {
            const orderTotal = limitPrice * orderAmount;
            
            if (side === 'Buy') {
                if (quoteBalance < orderTotal) throw new Error(`Insufficient ${quoteAsset} balance in ${walletType} wallet`);
                transaction.update(userRef, {
                    [quoteKey]: quoteBalance - orderTotal,
                    [quoteLockedKey]: currentQuoteLocked + orderTotal
                });
            } else if (side === 'Sell') {
                if (baseBalance < orderAmount) throw new Error(`Insufficient ${baseAsset} balance in ${walletType} wallet`);
                transaction.update(userRef, {
                    [baseKey]: baseBalance - orderAmount,
                    [baseLockedKey]: currentBaseLocked + orderAmount
                });
            }

            const orderRef = doc(collection(db, 'orders'));
            transaction.set(orderRef, {
                userId,
                pair,
                walletType,
                type,
                side,
                price: limitPrice,
                amount: orderAmount,
                total: orderTotal,
                status: 'Open',
                filledAmount: 0,
                createdAt: serverTimestamp()
            });
            return;
        }

        if (type === 'Market') {
            const opposingSide = side === 'Buy' ? 'Sell' : 'Buy';
            const sortDirection = side === 'Buy' ? 'asc' : 'desc';
            
            const obQuery = query(collection(db, 'orders'), 
                where('pair', '==', pair),
                where('status', '==', 'Open'),
                where('side', '==', opposingSide),
                where('type', '==', 'Limit'),
                orderBy('price', sortDirection),
                limit(50)
            );

            // Fetch matched orders OUTSIDE of the transaction write phase
            const obSnapshot = await getDocs(obQuery);
            
            let remainingAmountToFill = orderAmount;
            let totalCost = 0;
            const matchedOrders: any[] = [];
            
            for (const d of obSnapshot.docs) {
                if (remainingAmountToFill <= 0) break;
                const makerOrder = d.data();
                makerOrder.id = d.id;
                
                const makerAvailableAmount = makerOrder.amount - (makerOrder.filledAmount || 0);
                if (makerAvailableAmount <= 0) continue;

                const amountTaken = Math.min(makerAvailableAmount, remainingAmountToFill);
                const cost = amountTaken * makerOrder.price;
                
                matchedOrders.push({
                    docId: d.id,
                    userId: makerOrder.userId,
                    price: makerOrder.price,
                    amount: amountTaken,
                    cost,
                    originalMaker: makerOrder,
                    fullyFilled: makerAvailableAmount === amountTaken
                });

                remainingAmountToFill -= amountTaken;
                totalCost += cost;
            }

            if (side === 'Buy' && quoteBalance < totalCost) {
                throw new Error(`Insufficient ${quoteAsset} balance for Market order. Requires $${totalCost.toFixed(2)}`);
            } else if (side === 'Sell' && baseBalance < orderAmount) {
                throw new Error(`Insufficient ${baseAsset} balance. Requires ${orderAmount}`);
            }

            const takerOrderRef = doc(collection(db, 'orders'));
            const takerOrderId = takerOrderRef.id;
            
            transaction.set(takerOrderRef, {
                userId,
                pair,
                walletType,
                type: 'Market',
                side,
                price: totalCost > 0 && orderAmount > remainingAmountToFill ? totalCost / (orderAmount - remainingAmountToFill) : 0, 
                amount: orderAmount,
                total: totalCost,
                filledAmount: orderAmount - remainingAmountToFill,
                status: remainingAmountToFill > 0 ? (remainingAmountToFill === orderAmount ? 'Canceled' : 'Filled') : 'Filled',
                createdAt: serverTimestamp()
            });

            if (matchedOrders.length === 0) {
                throw new Error('No liquidity available for this pair. Cannot execute market order.');
            }

            let nextQuoteBalance = quoteBalance;
            let nextBaseBalance = baseBalance;
            
            if (side === 'Buy') {
                nextQuoteBalance -= totalCost;
                nextBaseBalance += (orderAmount - remainingAmountToFill);
            } else {
                nextBaseBalance -= orderAmount;
                nextQuoteBalance += totalCost;
            }
            
            transaction.update(userRef, {
                [quoteKey]: nextQuoteBalance,
                [baseKey]: nextBaseBalance
            });

            for (const match of matchedOrders) {
                const mRef = doc(db, 'users', match.userId);
                const mDoc = await transaction.get(mRef);
                if (!mDoc.exists()) continue;
                
                const mProfile = mDoc.data()!;
                const newFilled = (match.originalMaker.filledAmount || 0) + match.amount;
                
                transaction.update(doc(db, 'orders', match.docId), {
                    filledAmount: newFilled,
                    status: match.fullyFilled ? 'Filled' : 'Open'
                });

                const mQuoteKey = `wallets.${walletType}.${quoteAsset}`;
                const mBaseKey = `wallets.${walletType}.${baseAsset}`;
                const mQuoteLockedKey = `locked.${walletType}.${quoteAsset}`;
                const mBaseLockedKey = `locked.${walletType}.${baseAsset}`;
                
                let mQBal = mProfile.wallets?.[walletType]?.[quoteAsset] ?? 0;
                let mBBal = mProfile.wallets?.[walletType]?.[baseAsset] ?? 0;
                if (walletType === 'MAIN') {
                    if (mQBal === 0) mQBal = (quoteAsset === 'USD' ? mProfile.balanceUSD : mProfile.balanceUSDT) || 0;
                    if (mBBal === 0) mBBal = mProfile[`balance${baseAsset}`] || 0;
                }
                const mQLocked = mProfile.locked?.[walletType]?.[quoteAsset] || 0;
                const mBLocked = mProfile.locked?.[walletType]?.[baseAsset] || 0;

                const mUpdates: Record<string, any> = {};

                if (opposingSide === 'Sell') {
                    mUpdates[mBaseLockedKey] = Math.max(0, mBLocked - match.amount);
                    mUpdates[mQuoteKey] = mQBal + match.cost;
                } else if (opposingSide === 'Buy') {
                    mUpdates[mQuoteLockedKey] = Math.max(0, mQLocked - match.cost);
                    mUpdates[mBaseKey] = mBBal + match.amount;
                }
                transaction.update(mRef, mUpdates);

                const tradeRef = doc(collection(db, 'trades'));
                transaction.set(tradeRef, {
                    makerOrderId: match.docId,
                    takerOrderId,
                    makerId: match.userId,
                    takerId: userId,
                    pair,
                    type: 'Market',
                    side,
                    price: match.price,
                    amount: match.amount,
                    total: match.cost,
                    fee: match.cost * 0.001,
                    createdAt: serverTimestamp()
                });
            }
        }
    });
}

export async function cancelSpotOrder(orderId: string, userId: string) {
    const orderRef = doc(db, 'orders', orderId);
      
    await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) throw new Error('Order not found');
        
        const order = orderDoc.data()!;
        if (order.status !== 'Open') throw new Error('Order already filled or canceled');
        if (order.userId !== userId) throw new Error('Unauthorized');

        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        const profile = userDoc.data()!;

        const [baseAsset, quoteAsset] = order.pair.split('/');
        const walletType = order.walletType || 'MAIN';
        
        const quoteKey = `wallets.${walletType}.${quoteAsset}`;
        const baseKey = `wallets.${walletType}.${baseAsset}`;
        const quoteLockedKey = `locked.${walletType}.${quoteAsset}`;
        const baseLockedKey = `locked.${walletType}.${baseAsset}`;

        let quoteBalance = profile.wallets?.[walletType]?.[quoteAsset] ?? 0;
        let baseBalance = profile.wallets?.[walletType]?.[baseAsset] ?? 0;
        if (walletType === 'MAIN') {
            if (quoteBalance === 0) quoteBalance = (quoteAsset === 'USD' ? profile.balanceUSD : profile.balanceUSDT) || 0;
            if (baseBalance === 0) baseBalance = profile[`balance${baseAsset}`] || 0;
        }

        const currentQuoteLocked = profile.locked?.[walletType]?.[quoteAsset] || 0;
        const currentBaseLocked = profile.locked?.[walletType]?.[baseAsset] || 0;

        const remainingAmount = order.amount - (order.filledAmount || 0);

        if (order.side === 'Buy') {
            const remainingTotalCost = order.price * remainingAmount;
            transaction.update(userRef, {
                [quoteLockedKey]: Math.max(0, currentQuoteLocked - remainingTotalCost),
                [quoteKey]: quoteBalance + remainingTotalCost
            });
        } else {
            transaction.update(userRef, {
                [baseLockedKey]: Math.max(0, currentBaseLocked - remainingAmount),
                [baseKey]: baseBalance + remainingAmount
            });
        }

        transaction.update(orderRef, { status: 'Canceled' });
    });
}

export async function getSpotKlines(pair: string, interval: string, limitCount: number) {
    const match = interval.match(/^(\d+)([smhd])$/);
    let msInterval = 60 * 1000;
    if (match) {
        const val = parseInt(match[1]);
        const unit = match[2];
        if (unit === 's') msInterval = val * 1000;
        else if (unit === 'm') msInterval = val * 60 * 1000;
        else if (unit === 'h') msInterval = val * 60 * 60 * 1000;
        else if (unit === 'd') msInterval = val * 24 * 60 * 60 * 1000;
    }

    const q = query(
        collection(db, 'trades'),
        where('pair', '==', pair),
        orderBy('createdAt', 'desc'),
        limit(5000)
    );
      
    const tSnapshot = await getDocs(q);

    if (tSnapshot.empty) {
        return [];
    }

    const trades = tSnapshot.docs.map(d => {
        const data = d.data();
        return {
            time: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
            price: parseFloat(data.price),
            amount: parseFloat(data.amount)
        };
    }).sort((a, b) => a.time - b.time);
      
    const klinesMap = new Map();
    for (const trade of trades) {
        const bucketTime = Math.floor(trade.time / msInterval) * msInterval;
        if (!klinesMap.has(bucketTime)) {
            klinesMap.set(bucketTime, {
                time: bucketTime, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.amount
            });
        } else {
            const kline = klinesMap.get(bucketTime);
            kline.high = Math.max(kline.high, trade.price);
            kline.low = Math.min(kline.low, trade.price);
            kline.close = trade.price;
            kline.volume += trade.amount;
        }
    }

    const klines = Array.from(klinesMap.values())
        .sort((a, b) => a.time - b.time)
        .slice(-limitCount);

    return klines.map((k: any) => ({
        time: Math.floor(k.time / 1000),
        open: k.open, high: k.high, low: k.low, close: k.close, value: k.volume
    }));
}

export async function simulateFillSpotOrder(orderId: string, userId: string) {
    const orderRef = doc(db, 'orders', orderId);
      
    await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) throw new Error('Order not found');
        
        const order = orderDoc.data()!;
        if (order.status !== 'Open') throw new Error('Order already filled or canceled');
        if (order.userId !== userId) throw new Error('Unauthorized');

        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        const profile = userDoc.data()!;

        const [baseAsset, quoteAsset] = order.pair.split('/');
        const walletType = order.walletType || 'MAIN';
        
        const quoteKey = `wallets.${walletType}.${quoteAsset}`;
        const baseKey = `wallets.${walletType}.${baseAsset}`;
        const quoteLockedKey = `locked.${walletType}.${quoteAsset}`;
        const baseLockedKey = `locked.${walletType}.${baseAsset}`;

        let quoteBalance = profile.wallets?.[walletType]?.[quoteAsset] ?? 0;
        let baseBalance = profile.wallets?.[walletType]?.[baseAsset] ?? 0;
        if (walletType === 'MAIN') {
            if (quoteBalance === 0) quoteBalance = (quoteAsset === 'USD' ? profile.balanceUSD : profile.balanceUSDT) || 0;
            if (baseBalance === 0) baseBalance = profile[`balance${baseAsset}`] || 0;
        }

        const currentQuoteLocked = profile.locked?.[walletType]?.[quoteAsset] || 0;
        const currentBaseLocked = profile.locked?.[walletType]?.[baseAsset] || 0;

        const remainingAmount = order.amount - (order.filledAmount || 0);
        const remainingTotalCost = order.price * remainingAmount;

        if (order.side === 'Buy') {
            transaction.update(userRef, {
                [quoteLockedKey]: Math.max(0, currentQuoteLocked - remainingTotalCost),
                [baseKey]: baseBalance + remainingAmount
            });
        } else {
            transaction.update(userRef, {
                [baseLockedKey]: Math.max(0, currentBaseLocked - remainingAmount),
                [quoteKey]: quoteBalance + remainingTotalCost
            });
        }

        transaction.update(orderRef, { status: 'Filled', filledAmount: order.amount });
    });
}
