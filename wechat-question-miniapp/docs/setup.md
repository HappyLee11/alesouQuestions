# Setup Guide

## 1. Import into WeChat DevTools

- Open WeChat DevTools
- Import project directory: `wechat-question-miniapp`
- Confirm `miniprogramRoot=miniprogram` and `cloudfunctionRoot=cloudfunctions`

## 2. Configure cloud env

Replace all `your-cloud-env-id` values with your real cloud environment ID.

## 3. Create collections

- `questions`
- `admins`

## 4. Seed sample data

Use the JSON file in `data/sample-questions.json`, or copy items into the import page after admin setup.

## 5. Deploy cloud functions

Deploy all six functions from DevTools before testing admin actions.

## 6. Grant admin access

Add a document to `admins`:

```json
{
  "openid": "your-openid",
  "name": "Primary Admin",
  "enabled": true,
  "role": "super_admin"
}
```

You can get your current openid by temporarily invoking `checkAdmin` and checking the returned payload.
