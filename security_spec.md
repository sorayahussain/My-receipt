# Security Specification for MyReceipt

## Data Invariants
1. A receipt must belong to exactly one user (`ownerId`).
2. A user can only read, write, or delete their own receipts.
3. Total amount must be a number and non-negative.
4. Currency must be a 3-letter uppercase code.
5. Merchant name must be at least 1 character long.

## The Dirty Dozen Payloads (Target: Permission Denied)

1. **Identity Spoofing**: User A trying to create a receipt with `ownerId: "UserB"`.
2. **Cross-User Read**: User A trying to `get` User B's receipt.
3. **Cross-User Update**: User A trying to `update` User B's receipt.
4. **Invalid Amount Type**: Setting `totalAmount: "ten dollars"`.
5. **Negative Amount**: Setting `totalAmount: -50.00`.
6. **Currency Poisoning**: Setting `currency: "VERY_LONG_CURRENCY_CODE_OVER_LIMIT"`.
7. **Bypass Validation**: Creating a receipt without a `merchantName`.
8. **Shadow Field Injection**: Adding `isVerified: true` to a receipt update.
9. **Timestamp Spoofing**: Providing a `createdAt` from the past instead of `request.time`.
10. **Global Registry Read**: Trying to `list` the `/users` collection without specifically targeting their own ID.
11. **Malicious ID Injection**: Creating a receipt with a document ID of 2KB of junk data.
12. **Unauthorized PII Read**: Trying to read the `/users/{userId}` document of another user.

## Test Runner (Conceptual)
All tests should verify `PERMISSION_DENIED` for the above cases using the Firebase Emulator or equivalent.
