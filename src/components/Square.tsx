import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  Repeat, 
  Image as ImageIcon, 
  Users, 
  Newspaper, 
  GraduationCap, 
  FileText,
  ChevronRight,
  Clock,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Bookmark,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function Square({
  activeCategory: propActiveCategory,
  setActiveCategory: propSetActiveCategory,
  setCurrentView,
  setAuthMode
}: {
  activeCategory?: 'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG';
  setActiveCategory?: (v: 'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG') => void;
  setCurrentView?: (v: string) => void;
  setAuthMode?: (m: 'LOGIN' | 'REGISTER') => void;
} = {}) {
  const { user, profile } = useAuth();
  const [localCategory, setLocalCategory] = useState<'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG'>('COMMUNITY');
  const activeCategory = propActiveCategory || localCategory;
  const setActiveCategory = propSetActiveCategory || setLocalCategory;
  const [inputText, setInputText] = useState('');
  
  const initialPosts = [
    { id: '1', name: "Crypto King", handle: "@cryptoking", time: "2h", content: "Bitcoin is showing strong momentum here. If we break the resistance at $78k, we might see a rally towards the next psychological barrier. What are your thoughts on the macro environment? 🚀📈 #Bitcoin #Crypto", likes: 1240, likesUsers: [] as string[], retweets: 342, replies: 89 },
    { id: '2', name: "DeFi Degen", handle: "@defidegen", time: "4h", content: "Just ape'd into the new liquidity pool on Solana. The APY is crazy right now. Make sure you understand impermanent loss before jumping in though. DYOR!", likes: 856, likesUsers: [] as string[], retweets: 120, replies: 45 },
    { id: '3', name: "Web3 Builder", handle: "@web3builder", time: "5h", content: "The UX of most decentralized apps is still the biggest hurdle to mass adoption. We need to abstract away seed phrases and gas fees. Account abstraction is the future.", likes: 2100, likesUsers: [] as string[], retweets: 890, replies: 124 },
    { id: '4', name: "NFT Collector", handle: "@nftcollector", time: "8h", content: "Swept the floor on my favorite collection today. The art is just too good to ignore. Expecting a big announcement from the team next week. 🖼️💎", likes: 540, likesUsers: [] as string[], retweets: 56, replies: 21 },
  ];

  interface PostType {
    id: string | number;
    name: string;
    handle: string;
    time: string;
    content: string;
    likes: number;
    likesUsers: string[];
    retweets: number;
    replies: number;
  }

  const [posts, setPosts] = useState<PostType[]>(initialPosts);

  // Read live posts from Firestore with fallback to initial posts
  useEffect(() => {
    const pathForOnSnapshot = 'posts';
    try {
      const q = query(collection(db, pathForOnSnapshot), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          // Calculate readable time from createdAt timestamp
          let postTime = 'Just now';
          if (data.createdAt) {
            const date = data.createdAt.toDate();
            const diffMs = Date.now() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            if (diffMins < 1) postTime = 'Just now';
            else if (diffMins < 60) postTime = `${diffMins}m`;
            else if (diffHours < 24) postTime = `${diffHours}h`;
            else postTime = date.toLocaleDateString();
          }
          return {
            id: doc.id,
            name: data.name || 'CEXPRO User',
            handle: data.handle || '@user',
            time: postTime,
            content: data.content || '',
            likes: data.likes || 0,
            likesUsers: data.likesUsers || [],
            retweets: data.retweets || 0,
            replies: data.replies || 0
          };
        });
        // Combine live posts with initial template posts for a rich feed experience
        setPosts([...fetched, ...initialPosts.filter(ip => !fetched.some(fp => String(fp.id) === String(ip.id)))]);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, pathForOnSnapshot);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error setting up live posts snapshot listener:", e);
    }
  }, []);

  const handlePost = async () => {
    if (!inputText.trim()) return;
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    const username = profile?.email ? profile.email.split('@')[0] : 'cexpro_trader';
    const cleanHandle = `@${username}`;
    const postId = `post_${Date.now()}`;
    const newPostDoc = {
      postId,
      userId: user.uid,
      name: profile?.email ? username : 'CEXPRO Trader',
      handle: cleanHandle,
      content: inputText,
      likes: 0,
      likesUsers: [],
      retweets: 0,
      replies: 0,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'posts', postId), newPostDoc);
      setInputText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleLike = async (id: string | number) => {
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    // For standard sample posts that aren't in firestore, allow visual local update
    if (typeof id === 'number' || id === '1' || id === '2' || id === '3' || id === '4') {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
      return;
    }
    const postRef = doc(db, 'posts', String(id));
    const findPost = posts.find(p => p.id === id);
    if (!findPost) return;

    const likedUsersList = findPost.likesUsers || [];
    const isAlreadyLiked = likedUsersList.includes(user.uid);
    const updatedLikesUsers = isAlreadyLiked 
      ? likedUsersList.filter((uid: string) => uid !== user.uid)
      : [...likedUsersList, user.uid];
    const likesDiff = isAlreadyLiked ? -1 : 1;

    try {
      await updateDoc(postRef, {
        likes: Math.max(0, (findPost.likes || 0) + likesDiff),
        likesUsers: updatedLikesUsers
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handleRepost = async (id: string | number) => {
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    if (typeof id === 'number' || id === '1' || id === '2' || id === '3' || id === '4') {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, retweets: p.retweets + 1 } : p));
      return;
    }
    const postRef = doc(db, 'posts', String(id));
    const findPost = posts.find(p => p.id === id);
    if (!findPost) return;
    try {
      await updateDoc(postRef, {
        retweets: (findPost.retweets || 0) + 1
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `posts/${id}`);
    }
  };

  // Category list referencing the specific image names & descriptions
  const categories = [
    { 
      id: 'COMMUNITY' as const, 
      title: 'Community', 
      subtitle: 'Insights from experts', 
      icon: Users,
      badge: 'Expert Feed',
      color: "text-[#10B981]", 
      bg: "bg-[#10B981]/10"
    },
    { 
      id: 'NEWS' as const, 
      title: 'News', 
      subtitle: 'Latest media articles', 
      icon: Newspaper,
      badge: 'Live News',
      color: "text-teal-500", 
      bg: "bg-teal-500/10"
    },
    { 
      id: 'ACADEMY' as const, 
      title: 'Cexpro Academy', 
      subtitle: 'Learn about crypto and the blockchain', 
      icon: GraduationCap,
      badge: 'Tutorials',
      color: "text-primary-500", 
      bg: "bg-primary-500/10"
    },
    { 
      id: 'BLOG' as const, 
      title: 'Cexpro Blog', 
      subtitle: 'In-depth analysis, trading strategies, and market outlooks', 
      icon: FileText,
      badge: 'Research',
      color: "text-[#F43F5E]", 
      bg: "bg-[#F43F5E]/10"
    },
  ];

  // News curated list
  const newsArticles = [
    {
      id: 1,
      source: "Bloomberg Crypto",
      time: "25m ago",
      title: "Bitcoin Surpasses $75,000 Milestone Mark Driven by Relentless ETF Allocation",
      summary: "Inflows into institutional spot exchange products continue at record pace. Analysts see high probability of ongoing consolidation before aiming for key psychological six-figure bounds.",
      reads: "14.2K reads",
      tag: "BTC"
    },
    {
      id: 2,
      source: "Reuters Finance",
      time: "1h ago",
      title: "Consensus Layer Upgrade Successfully Deployed on Testnets with High Efficiencies",
      summary: "Core blockchain developers confirmed smooth network execution. The final mainnet implementation schedule promises significantly optimized transaction validation delays.",
      reads: "8.5K reads",
      tag: "Tech"
    },
    {
      id: 3,
      source: "Wall Street Journal",
      time: "2h ago",
      title: "SEC Grants Final Authorization For Options Trading on Spot Ethereum Accounts",
      summary: "The greenlight introduces vast derivatives structuring possibilities for registered hedge funds and treasury desk managers looking to customize ether yield exposure.",
      reads: "19.1K reads",
      tag: "ETH"
    },
    {
      id: 4,
      source: "CoinDesk Research",
      time: "4h ago",
      title: "On-Chain Activity Metrics Reach Peak Densities Across Liquid Layer-2 Chains",
      summary: "Transaction numbers surpass native mainnet capacities as smart contracts abstract gas overhead with batch compression rollups. DeFi yields remain resiliently high.",
      reads: "11.3K reads",
      tag: "DeFi"
    }
  ];

  // Academy Curated list
  const academyCourses = [
    {
      id: 1,
      level: "Beginner",
      duration: "15 min read",
      title: "The Mechanics of Spot Trading: Order Book & Order Types",
      desc: "Learn how matching engines pair bids and asks. Understand the differences between market executions, limit orders, and stop conditions to enhance capital allocation safety.",
      modules: 4,
      author: "CEXPRO Education"
    },
    {
      id: 2,
      level: "Intermediate",
      duration: "25 min read",
      title: "Advanced Position Hedging: Leveraging Spot and Perpetual Swaps",
      desc: "An end-to-end framework discussing funding rate exploits, spot-futures arbitrage, and hedging portfolio asset variance using highly reliable custom order combinations.",
      modules: 6,
      author: "Trading Desk Research"
    },
    {
      id: 3,
      level: "Beginner",
      duration: "10 min read",
      title: "Cold Wallets vs. Hot Storage: Safeguarding Private Keys",
      desc: "Best practices surrounding self-custody. Learn the underlying mathematics behind seed recovery strings, multi-signature authentication blocks, and hardware security paradigms.",
      modules: 3,
      author: "Security Team"
    },
    {
      id: 4,
      level: "Advanced",
      duration: "40 min read",
      title: "Order Flow Analysis & Volume Profiles in Volatile Assets",
      desc: "Gain deep insights into order book liquidity imbalance, dynamic delta metrics, and point of control trading nodes to identify institutional block levels visually.",
      modules: 8,
      author: "Market Maker Core"
    }
  ];

  // Blog Curated list
  const blogPosts = [
    {
      id: 1,
      category: "Market Outlook",
      date: "May 21, 2026",
      title: "CEXPRO Quarterly Research: Macro-Liquidity Shifts & Token Valuation Models",
      summary: "An intensive data-driven review evaluating sovereign treasury reserves, institutional asset class rotations, and network-value-to-transaction (NVT) indicators for prime Layer-1 ecosystems.",
      author: "Chief Market Officer"
    },
    {
      id: 2,
      category: "Trading Strategies",
      date: "May 19, 2026",
      title: "Deciphering Liquidity Sweeps and Fakeouts in Consolidation ranges",
      summary: "Step-by-step analytical tactics on how smart money captures retail stop liquidity before changing primary direction. Learn how to stay on the correct side of trend structures.",
      author: "Head of Arbitrage"
    },
    {
      id: 3,
      category: "Protocol Deep Dive",
      date: "May 14, 2026",
      title: "The Technical Progression of Zero-Knowledge Rollups and Account Abstraction",
      summary: "Exploring state verification compression, bundler setups, and paymaster specifications that allow decentralized users to seamlessly pay gas fees with any custom token asset.",
      author: "Lead Tech Strategist"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-dark-bg w-full custom-scroll"
    >
      <div className="w-full p-4 md:p-6 lg:p-8">
        
            {/* Responsive Mobile / Tablet navigation bar */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-4 scrollbar-none mb-4 shrink-0 select-none">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded whitespace-nowrap text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-white text-dark-bg font-extrabold shadow' 
                        : 'bg-dark-surface border border-dark-border text-dark-text-muted hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-dark-bg' : 'text-primary-500'}`} />
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full flex flex-col md:flex-row gap-8 items-stretch">
              
              {/* CENTRAL FEED COLUMN - Renders dynamic content based on selected tab */}
          <div className="flex-1 min-w-0 space-y-6">
            


            {/* View renders */}
            {activeCategory === 'COMMUNITY' && (
              <>
                {/* Post Creator Box */}
                <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-extrabold shrink-0 border border-dark-border select-none">
                       CP
                     </div>
                     <div className="flex-1">
                       <textarea 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         placeholder="Share your technical analysis, questions, or news with CEXPRO experts..." 
                         className="w-full bg-transparent border-none text-white focus:outline-none min-h-[70px] resize-none text-[15px] placeholder-dark-text-muted font-sans"
                       ></textarea>
                       <div className="flex items-center justify-between pt-3 border-t border-dark-border/60">
                         <div className="flex gap-4 text-[#8B8B93]">
                            <button className="hover:bg-dark-surface-alt p-2 rounded-full transition-colors cursor-pointer" title="Simulate photo upload">
                              <ImageIcon className="w-4 h-4 text-white" />
                            </button>
                         </div>
                         <button 
                           onClick={handlePost}
                           className="bg-white hover:bg-white/90 text-dark-bg font-extrabold py-1.5 px-6 rounded-full text-xs transition-colors cursor-pointer select-none"
                         >
                           Publish Post
                         </button>
                       </div>
                     </div>
                  </div>
                </div>

                {/* Feed Lists */}
                <div className="space-y-4">
                  {posts.map((post, i) => (
                    <motion.div 
                      key={post.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:bg-dark-surface/80 transition-all cursor-pointer"
                    >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-dark-border shrink-0 flex items-center justify-center font-extrabold text-dark-text select-none text-xs border border-dark-border">
                          {post.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-extrabold text-sm">{post.name}</h3>
                            <span className="text-dark-text-muted text-xs font-semibold">{post.handle}</span>
                            <span className="text-dark-text-muted text-xs">·</span>
                            <span className="text-dark-text-muted text-xs">{post.time}</span>
                          </div>
                          <p className="text-white text-[14px] leading-relaxed mb-4 whitespace-pre-wrap font-sans">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-7 text-[#8B8B93] text-xs max-w-md select-none">
                            <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group">
                              <MessageSquare className="w-4 h-4" />
                              <span>{post.replies}</span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRepost(post.id); }}
                              className="flex items-center gap-1.5 hover:text-buy transition-colors cursor-pointer group"
                            >
                              <Repeat className="w-4 h-4" />
                              <span>{post.retweets}</span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                              className="flex items-center gap-1.5 hover:text-sell transition-colors cursor-pointer group"
                            >
                              <Heart className="w-4 h-4" />
                              <span>{post.likes}</span>
                            </button>
                            <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ml-auto">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {activeCategory === 'NEWS' && (
              <div className="space-y-4">
                {newsArticles.map((art, i) => (
                  <motion.div
                    key={art.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2.5 text-xs text-dark-text-muted select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white bg-white/10 px-2 py-0.5 rounded text-[10px] tracking-wide">{art.source}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{art.time}</span>
                      </div>
                      <div className="bg-primary-500/10 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{art.tag}
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-base leading-snug hover:text-primary-600 transition-colors cursor-pointer">
                      {art.title}
                    </h3>
                    <p className="text-dark-text-muted text-xs leading-relaxed mt-2 line-clamp-2">
                      {art.summary}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-dark-border/40 text-xs">
                      <span className="text-dark-text-muted font-medium">{art.reads}</span>
                      <button className="text-white hover:underline text-xs flex items-center gap-1 font-bold cursor-pointer">
                        <span>Read Full Report</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeCategory === 'ACADEMY' && (
              <div className="grid grid-cols-1 gap-4">
                {academyCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 flex flex-col justify-between hover:border-white/20 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-bold tracking-wider select-none">
                        <span className="bg-white text-dark-bg px-2 py-0.5 rounded font-black">{course.level}</span>
                        <span className="text-dark-text-muted flex items-center gap-1 font-mono">
                          <BookOpen className="w-3.5 h-3.5" /> {course.duration}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base group-hover:text-primary-500 transition-colors cursor-pointer">
                        {course.title}
                      </h3>
                      <p className="text-dark-text-muted text-xs leading-relaxed mt-2">
                        {course.desc}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-dark-border/40 select-none">
                      <span className="text-xs text-dark-text-muted font-semibold">
                        {course.modules} learning sections · Created by {course.author}
                      </span>
                      <button className="bg-white/10 hover:bg-white text-white hover:text-dark-bg transition-all px-4 py-1.5 rounded text-xs font-extrabold flex items-center gap-1 cursor-pointer">
                        <span>Start Course</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeCategory === 'BLOG' && (
              <div className="space-y-4">
                {blogPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs select-none">
                      <span className="text-primary-500 bg-primary-500/10 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                        {post.category}
                      </span>
                      <span className="text-dark-text-muted font-mono">{post.date}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-snug cursor-pointer hover:text-primary-500 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-dark-text-muted text-xs leading-relaxed mt-2.5">
                      {post.summary}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-dark-border/40 text-xs select-none">
                      <span className="text-dark-text-muted font-semibold">
                        Author: <span className="text-white">{post.author}</span>
                      </span>
                      <div className="flex gap-2">
                        <button className="p-1.5 text-dark-text-muted hover:text-white transition-colors cursor-pointer" title="Bookmark article">
                          <Bookmark className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-dark-text-muted hover:text-white transition-colors cursor-pointer" title="Share article">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR COLUMN - Trending Topics stays fully intact */}
          <div className="w-80 hidden lg:block shrink-0 space-y-4 select-none">
            <div className="bg-dark-surface border border-dark-border/60 rounded-xl p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <span>Trending Topics</span>
                </h3>
              </div>
              <div className="space-y-4">
                {['#BTC', '#EthereumETF', '#SolanaSummer', '#DeFi', '#Web3Gaming'].map((topic, i) => (
                  <div key={i} className="cursor-pointer group pb-3 border-b border-dark-border/40 last:border-0 last:pb-0">
                    <div className="text-[10px] text-dark-text-muted flex justify-between">
                       <span>Trending in Crypto</span>
                    </div>
                    <div className="text-white text-xs font-black group-hover:text-primary-500 transition-colors mt-0.5">{topic}</div>
                    <div className="text-[10px] text-dark-text-muted mt-0.5">
                      {Math.floor(Math.random() * 40) + 15}K real-time posts
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
  </div>
</motion.div>
);
}
