# Security Specification - SabanOS

## Data Invariants
1. **Orders**: Must have a valid date, time, and customer name. Can only be created by verified users. Only admins can delete.
2. **Messages**: Must have a sender ID matching the authenticated user. Visibility can be 'everyone' or 'managers'.
3. **Reminders**: Strictly private to the user who created them.
4. **Transfers**: Relational to branches. Only verified users can create/update.
5. **Drivers/Customers**: Only verified users can manage.

## The "Dirty Dozen" Payloads (Attack Vectors)
1. **Identity Spoofing**: Attempting to send a message as another user ID.
2. **Privilege Escalation**: Non-admin attempting to delete an order.
3. **Visibility Leak**: Non-manager attempting to read a 'managers' message.
4. **Shadow Field Injection**: Adding an `isAdmin` field to a user profile or order.
5. **Terminal State Bypass**: Updating an order that is already 'delivered'.
6. **Orphaned Writes**: Creating a task for a non-existent user.
7. **Resource Exhaustion**: Sending a message with a 10MB text string.
8. **ID Poisoning**: Using a 1KB string as a document ID.
9. **Relational Sync Gap**: Creating a transfer without branch validation.
10. **Unauthorized Read**: Attempting to list all reminders in the system.
11. **Spoofed Timestamps**: Providing a client-side `createdAt` date in the future.
12. **Insecure Read**: querying messages without a visibility filter.

## Test Strategy
- Verify that `readBy` can only be updated by adding the current user's UID.
- Verify that `video` type is allowed for messages.
- Verify that metadata and file fields are permitted in messages.
