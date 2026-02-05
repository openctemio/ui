import type { Group, GroupType } from '../types';
import { GroupTypeConfig } from '../types';

/**
 * Generate a URL-friendly slug from a name
 */
export const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-');      // Remove consecutive hyphens
};

/**
 * Get the group type, handling both group_type and type fields
 * Falls back to 'team' if type is invalid
 */
export const getGroupType = (group: Group): GroupType => {
    const type = group.group_type || group.type;
    // Validate that type is a valid GroupType
    if (type && type in GroupTypeConfig) {
        return type as GroupType;
    }
    return 'team';
};

/**
 * Format a date string for display
 */
export const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Get initials from a name
 */
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
