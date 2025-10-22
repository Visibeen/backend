# WhatsApp Template Language Configuration

## ⚠️ CRITICAL: Template Name Mismatch!

## Root Cause
Your `.env` file has the **WRONG template name**:
- ❌ `.env` says: `task_notification_v2`
- ✅ Meta has: `tasks`

## Problem
Template `task_notification_v2` doesn't exist. The actual template name is `tasks`.

## ✅ SOLUTION

Update your `.env` file with the **CORRECT** template name and language:

```env
# Change this line:
META_WHATSAPP_TASK_TEMPLATE=task_notification_v2  ❌ WRONG

# To this:
META_WHATSAPP_TASK_TEMPLATE=tasks  ✅ CORRECT

# And set the language:
META_WHATSAPP_TEMPLATE_LANGUAGE=en  ✅ CORRECT
```

## Template Details from Meta API

```json
{
  "name": "tasks",
  "language": "en",
  "status": "APPROVED",
  "category": "MARKETING"
}
```

### Option 2: Let Auto-Detection Work

The system will automatically fetch the correct language code from Meta's API.

**Check the logs for:**
```
🔍 Fetching template metadata for: task_notification_v2
📦 Templates API response: {...}
📋 Found template: {...}
✅ Auto-detected template language: en
```

## Testing Steps

1. **Update `.env` file** with manual override:
   ```env
   META_WHATSAPP_TEMPLATE_LANGUAGE=en
   ```

2. **Restart backend server:**
   ```bash
   npm start
   ```

3. **Create a test task** in admin dashboard

4. **Check console logs** for:
   - `🔧 Using manual language override: en`
   - `🌐 Language code: en`
   - `✅ WhatsApp notification sent`

## Troubleshooting

### If still getting error with `en`:

Try other language codes:
```env
# Try US English
META_WHATSAPP_TEMPLATE_LANGUAGE=en_US

# Or British English
META_WHATSAPP_TEMPLATE_LANGUAGE=en_GB
```

### Check your Meta template settings:

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to WhatsApp Manager → Message Templates
3. Click on `task_notification_v2`
4. Check the **Language** field - use that exact code

### Enable detailed logging:

The system now logs the full template metadata. Check console for:
```
📦 Templates API response: {
  "data": [
    {
      "name": "task_notification_v2",
      "language": "en",  // <-- This is what you need
      ...
    }
  ]
}
```

## Environment Variables Reference

```env
# Required
META_WHATSAPP_API_URL=https://graph.facebook.com/v22.0
META_WHATSAPP_PHONE_NUMBER_ID=858024370721192
META_WHATSAPP_ACCESS_TOKEN=your_new_access_token_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Template Configuration
META_WHATSAPP_USE_TEMPLATES=true
META_WHATSAPP_TASK_TEMPLATE=task_notification_v2
META_WHATSAPP_STATUS_TEMPLATE=task_notification_v2

# Language Override (Optional - use if auto-detection fails)
META_WHATSAPP_TEMPLATE_LANGUAGE=en
```

## Quick Fix Command

```bash
# Add to .env
echo "META_WHATSAPP_TEMPLATE_LANGUAGE=en" >> .env

# Restart server
npm start
```

## Expected Success Output

```
📱 Formatted phone: 094182 45371 → 919418245371

============================================================
📤 SENDING WHATSAPP MESSAGE
============================================================
📱 To: 919418245371
👤 User: Pankaj Kumar
📋 Task: Update meta tags on website
🔗 API URL: https://graph.facebook.com/v22.0/858024370721192/messages
🔑 Token: EAA7U0x6J1y4BPgZCCcN...
📞 Phone ID: 858024370721192
📝 Mode: TEMPLATE
============================================================

🔧 Using manual language override: en
📋 Using template: task_notification_v2
🌐 Language code: en
📦 Request Body: {...}

✅ WhatsApp API Response: {...}
✅ Message ID: wamid.xxx
✅ WhatsApp notification sent to 919418245371
```
