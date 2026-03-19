# Architecture Notes

## Frontend

- `pages/home`: navigation hub
- `pages/search`: keyword search and result list
- `pages/detail`: question detail display
- `pages/admin`: admin gate and shortcuts
- `pages/list`: lightweight CRUD list
- `pages/edit`: create/update form
- `pages/import`: bulk import via pasted JSON

## Data flow

1. UI calls `miniprogram/utils/question.js`
2. Utility layer calls cloud functions via `wx.cloud.callFunction`
3. If cloud search/detail fails during local development, UI falls back to local mock data
4. Admin mutation actions require deployed cloud functions and valid admin records

## Collections

### questions

Suggested fields:
- `title`
- `content`
- `answer`
- `analysis`
- `tags`
- `type`
- `options`
- `createdAt`
- `updatedAt`

### admins

Suggested fields:
- `openid`
- `name`
- `role`
- `enabled`

## Recommended next iterations

- add pagination and indexes
- add subject/category filters
- add rich content support
- add audit logs and soft delete
- add test data scripts and CI
