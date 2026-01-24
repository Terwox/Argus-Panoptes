/**
 * Browser notification utilities for blocked projects
 *
 * Handles requesting permission, showing notifications for blocked projects,
 * and tracking notification state to prevent duplicates.
 */

import { get } from 'svelte/store';
import { notifiedBlocked } from '../stores/state';
import type { Project } from '../../../shared/types';

/**
 * Request notification permission from the browser
 * @returns true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a notification for a blocked project
 * @param project The blocked project to notify about
 */
export function notifyBlockedProject(project: Project): void {
  // Check if already notified
  const notified = get(notifiedBlocked);
  if (notified.has(project.id)) return;

  // Check permission
  if (Notification.permission !== 'granted') return;

  // Find the blocked question
  const blockedAgent = Object.values(project.agents).find(a => a.status === 'blocked');
  const question = blockedAgent?.question || 'Needs your input';

  // Create notification
  const notification = new Notification(`${project.name}`, {
    body: question.slice(0, 80) + (question.length > 80 ? '...' : ''),
    icon: '/favicon.ico', // optional
    tag: project.id, // prevents duplicate notifications
    requireInteraction: false,
  });

  // Click to focus window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Mark as notified
  notifiedBlocked.update(set => { set.add(project.id); return new Set(set); });
}

/**
 * Clear notification state for a project (when it unblocks)
 * @param projectId The project ID to clear
 */
export function clearNotificationState(projectId: string): void {
  notifiedBlocked.update(set => { set.delete(projectId); return new Set(set); });
}
