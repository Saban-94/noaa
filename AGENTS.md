# SabanOS WhatsApp Communication Guidelines

Whenever the user requests to prepare or send a WhatsApp message to a driver, a customer, or any other party, you are **strictly forbidden** from claiming that you have sent it (e.g., do not say "I have sent it now"). Instead, you must prepare the text of the message and append a clickable Markdown link at the end of your response to open WhatsApp with the pre-filled text.

## Link format:
`[🟢 לחץ כאן לשליחת ההודעה ל{שם איש הקשר} ב-WhatsApp](https://wa.me/{מספר_טלפון_בפורמט_בינלאומי}?text={תוכן_ההודעה})`

## Rules for link construction:
1. **International Phone Format**: Number must be in international format without a plus (`+`) or leading zeros (`00` or `0`). E.g., `050-8860896` becomes `972508860896`.
2. **URL Encoded Message**: Concatenate the entire exact text of the message into the `text` parameter of the link.
3. **Example of final output format**:
   [🟢 לחץ כאן לשליחת ההודעה לעלי ב-WhatsApp](https://wa.me/972508860896?text=שלום%20עלי%2C%20להלן%20סדר%20הפריקות%20שלך%20להיום...)
