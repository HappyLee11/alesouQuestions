function normalizePermissions(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (input && Array.isArray(input.permissions)) return input.permissions.filter(Boolean);
  return [];
}

function hasPermission(input, permission) {
  return normalizePermissions(input).includes(permission);
}

function hasAnyPermission(input, permissions = []) {
  return permissions.some((permission) => hasPermission(input, permission));
}

function syncAdminContext(info = {}) {
  const app = getApp && getApp();
  if (!app || !app.globalData) return;
  app.globalData.adminChecked = true;
  app.globalData.isAdmin = !!info.isAdmin;
  app.globalData.adminInfo = info.admin || null;
}

module.exports = {
  normalizePermissions,
  hasPermission,
  hasAnyPermission,
  syncAdminContext
};
