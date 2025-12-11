// Team permission utilities and hooks

export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_MEMBERS: 'manage_members',
  DELETE_TEAM: 'delete_team',
  EDIT_TEAM_SETTINGS: 'edit_team_settings',
  
  // Member permissions
  CREATE_TASKS: 'create_tasks',
  EDIT_TASKS: 'edit_tasks',
  DELETE_TASKS: 'delete_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  SEND_MESSAGES: 'send_messages',
  
  // Viewer permissions
  VIEW_TASKS: 'view_tasks',
  VIEW_MESSAGES: 'view_messages'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.DELETE_TEAM,
    PERMISSIONS.EDIT_TEAM_SETTINGS,
    PERMISSIONS.CREATE_TASKS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.DELETE_TASKS,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_MESSAGES
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.CREATE_TASKS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.DELETE_TASKS,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_MESSAGES
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_MESSAGES
  ]
};

export function getUserRole(team, userId) {
  if (team.owner_id === userId) return ROLES.ADMIN;
  return team.member_roles?.[userId] || ROLES.MEMBER;
}

export function hasPermission(team, userId, permission) {
  const role = getUserRole(team, userId);
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function canEditTask(team, userId, task) {
  const role = getUserRole(team, userId);
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.MEMBER) {
    // Members can edit their own tasks or unassigned tasks
    return !task.assigned_to || task.assigned_to === userId;
  }
  return false;
}

export function getRoleBadgeColor(role) {
  switch (role) {
    case ROLES.ADMIN:
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case ROLES.MEMBER:
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case ROLES.VIEWER:
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

export function getRoleLabel(role) {
  switch (role) {
    case ROLES.ADMIN:
      return 'Admin';
    case ROLES.MEMBER:
      return 'Member';
    case ROLES.VIEWER:
      return 'Viewer';
    default:
      return 'Member';
  }
}