# Security Specifications & Security Rules Test Suite

## Phase 0: Payload-First Security TDD
This document outlines the zero-trust data invariants, security threat scenarios ("Dirty Dozen" payloads), and validation rules that secure the CEXPRO Exchange application.

---

## 1. Data Invariants & Zero-Trust Architecture
1. **Identity & Ownership Consistency**: Every client write must lock the `userId` field to `request.auth.uid`. Verification using `request.auth.token.email_verified == true` is strictly enforced.
2. **No Self-Elevation of Privileges**: Normal users cannot modify critical role parameters (e.g., `role: "admin"` or `role` changes). Changing the `role`, `status`, or balance parameters is restricted to admins (with selective overrides allowed for preview test modes).
3. **Anti-Update-Gap Validation**:スタンドアロン (standalone) validation helpers (`isValid[Entity]`) must run on both `create` and `update` transitions to prevent inserting or modifying files with missing properties or malformed types.
4. **Immutable Ledgers**: Finished trades (`/trades/{id}`) cannot be modified or deleted, securing consistent history recording.
5. **Enforced Query Safety (List Query evaluation)**: No blanket listings are allowed. User data queries must execute against standard rules verifying `resource.data.userId == request.auth.uid` or `request.auth.uid == userId`.
6. **Administrative Exclusivity**: Global configurations (`/system_config/global`) regulate exchange parameters and can only be modified by authentic, verified administrators.

---

## 2. The "Dirty Dozen" Vulnerability Vectors & Payloads
The following payloads describe malicious operations designed to breach the system bounds. Secure rules must guarantee a `PERMISSION_DENIED` result on each.

### Vector 1: Self-Privilege Escalation
* **Path**: `/users/attacker_uid`
* **Operation**: Create or Update
* **Payload**:
```json
{
  "userId": "attacker_uid",
  "email": "attacker@gmail.com",
  "role": "admin",
  "status": "active",
  "balanceUSD": 50000,
  "balanceBTC": 1.5,
  "createdAt": "serverTimestamp"
}
```
* **Defense**: Block standard users from introducing or updating a user record to have `role: 'admin'`.

### Vector 2: User Balance Infusion Bypass
* **Path**: `/users/attacker_uid`
* **Operation**: Update (Direct injection)
* **Payload**:
```json
{
  "userId": "attacker_uid",
  "email": "attacker@gmail.com",
  "role": "user",
  "status": "active",
  "balanceUSD": 10000000,
  "balanceBTC": 999.0,
  "createdAt": "originalTimestamp"
}
```
* **Defense**: Validate that standard balance overrides are subject to strict logic limits, otherwise administrative authentication is required to modify ledger balances.

### Vector 3: Identity Spoofing / Account Creation under Victim's UID
* **Path**: `/users/victim_uid`
* **Operation**: Create
* **Payload**:
```json
{
  "userId": "victim_uid",
  "email": "victim@gmail.com",
  "role": "user",
  "status": "active",
  "balanceUSD": 50000,
  "balanceBTC": 1.5,
  "createdAt": "serverTimestamp"
}
```
* **Defense**: Require `request.auth.uid == userId` for all self-service configurations.

### Vector 4: Third-Party Order Execution
* **Path**: `/orders/malicious_order_id`
* **Operation**: Create
* **Payload**:
```json
{
  "userId": "victim_uid",
  "pair": "BTC",
  "category": "Spot",
  "type": "Market",
  "side": "Buy",
  "price": 60000,
  "amount": 10.0,
  "total": 600000,
  "status": "Open",
  "createdAt": "serverTimestamp"
}
```
* **Defense**: Ensure `incoming().userId == request.auth.uid` for order listings.

### Vector 5: Order Value/Type Poisoning
* **Path**: `/orders/malicious_order_id`
* **Operation**: Create
* **Payload**:
```json
{
  "userId": "attacker_uid",
  "pair": "BTC_DOGE_INVALID_LONG_PAIR_STRING_MORE_THAN_15_CHARS",
  "category": "ArbitraryNonExistentCategory",
  "type": "ExploitType",
  "side": "HackSide",
  "price": -100.0,
  "amount": -0.05,
  "total": -5.0,
  "status": "Open",
  "createdAt": "serverTimestamp"
}
```
* **Defense**: Strict `.size() <= 15` constraints, type-safety checks (`is number`), and enum validations for category/type/side fields.

### Vector 6: Terminal State Shortcutting (Self-Filling Pending Orders)
* **Path**: `/orders/existing_open_order_id`
* **Operation**: Update
* **Payload**:
```json
{
  "userId": "attacker_uid",
  "pair": "BTC",
  "category": "Spot",
  "type": "Limit",
  "side": "Buy",
  "price": 60000,
  "amount": 0.5,
  "total": 30000,
  "status": "Filled",
  "createdAt": "originalTime"
}
```
* **Defense**: Restrict standard user modifications of order statuses strictly to cancel operations on their own open orders: `incoming().diff(existing()).affectedKeys().hasOnly(['status']) && existing().status == 'Open' && incoming().status == 'Canceled'`.

### Vector 7: Trading Ledger Deletion (Anti-Audit)
* **Path**: `/trades/trade_id_818`
* **Operation**: Delete
* **Defense**: Explicitly forbid updates or deletions of trade ledger documents by non-admin users.

### Vector 8: Support Ticket Hijacking (Targeting Victim's Issues)
* **Path**: `/support_tickets/victim_ticket_id`
* **Operation**: Write or Update
* **Payload**:
```json
{
  "ticketId": "victim_ticket_id",
  "userId": "victim_uid",
  "userEmail": "victim@gmail.com",
  "subject": "Compromised Access Action Required",
  "status": "Resolved",
  "messages": [],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```
* **Defense**: Evaluate document owners vs `request.auth.uid`.

### Vector 9: Global Config Fees & Leverage De-optimization
* **Path**: `/system_config/global`
* **Operation**: Write
* **Payload**:
```json
{
  "makerFeePercent": 0.0,
  "takerFeePercent": 0.0,
  "maxLeverage": 1000.0,
  "updatedAt": "serverTimestamp"
}
```
* **Defense**: Only genuine, verified administrative roles (`isAdmin()`) can modify `/system_config/{configId}` documents.

### Vector 10: ID Poisoning via Path Variable Overflows
* **Path**: `/orders/A_MASSIVE_1_MEGABYTE_JUNK_AND_POISONED_STRING_...`
* **Operation**: Create
* **Defense**: Execute path-variable validation through helper `isValidId(orderId)`, forcing lengths under 128 characters.

### Vector 11: Spoofed API Key Injection
* **Path**: `/api_keys/victim_key_token`
* **Operation**: Create
* **Payload**:
```json
{
  "userId": "victim_uid",
  "name": "Victim To Steal",
  "key": "victim-raw-secret-vffgg",
  "permissions": ["Trade"],
  "createdAt": "serverTimestamp"
}
```
* **Defense**: Enforce `incoming().userId == request.auth.uid`.

### Vector 12: Invalid Timestamp Manipulation (Client-Time Hijack)
* **Path**: `/orders/new_order`
* **Operation**: Create
* **Payload**:
```json
{
  "userId": "attacker_uid",
  "pair": "BTC",
  "category": "Spot",
  "type": "Market",
  "side": "Buy",
  "price": 60000,
  "amount": 0.1,
  "total": 6000,
  "status": "Open",
  "createdAt": "timestampRepresenting2005Or2045"
}
```
* **Defense**: All `createdAt` structures must exactly align: `incoming().createdAt == request.time`.

---

## 3. The Security Assertion Test Runner File
A typescript-ready validation mock verifying that security gates successfully intercept and stop the Dirty Dozen attacks.

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestApp, clearFirestoreData } from '@firebase/rules-unit-testing';

const PROJECT_ID = "cexpro-secure-exchange";

describe("CEXPRO Security Rules Validation Suite", () => {
  afterEach(async () => {
    await clearFirestoreData({ projectId: PROJECT_ID });
  });

  it("should fail self-privilege escalation (Vector 1)", async () => {
    const db = initializeTestApp({ projectId: PROJECT_ID, auth: { uid: "attacker", email_verified: true } }).firestore();
    const docRef = db.collection("users").doc("attacker");
    await assertFails(docRef.set({
      userId: "attacker",
      email: "attacker@gmail.com",
      role: "admin",
      status: "active",
      balanceUSD: 50000,
      balanceBTC: 1.5,
      createdAt: new Date()
    }));
  });

  it("should verify order ownership locks (Vector 4)", async () => {
    const db = initializeTestApp({ projectId: PROJECT_ID, auth: { uid: "attacker", email_verified: true } }).firestore();
    const docRef = db.collection("orders").doc("malicious_order");
    await assertFails(docRef.set({
      userId: "victim",
      pair: "BTC",
      category: "Spot",
      type: "Market",
      side: "Buy",
      price: 60000,
      amount: 1,
      total: 60000,
      status: "Open",
      createdAt: new Date()
    }));
  });
});
```
