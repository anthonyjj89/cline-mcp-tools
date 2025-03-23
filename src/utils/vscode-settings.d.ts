/**
 * Type declarations for VS Code Settings Parser module
 */

/**
 * VS Code workspace settings
 */
export interface WorkspaceSettings {
  hasSettings: boolean;
  settings?: Record<string, any>;
  error?: string;
}

/**
 * VS Code workspace information
 */
export interface WorkspaceInfo {
  hasWorkspaceFile: boolean;
  name: string;
  folders?: Array<{ path: string }>;
  settings?: Record<string, any>;
  error?: string;
}

/**
 * VS Code launch configurations
 */
export interface LaunchConfigurations {
  hasLaunchConfig: boolean;
  configurations?: Array<Record<string, any>>;
  error?: string;
}

/**
 * VS Code recommended extensions
 */
export interface RecommendedExtensions {
  hasRecommendations: boolean;
  recommendations?: string[];
  unwantedRecommendations?: string[];
  error?: string;
}

/**
 * Get VS Code workspace settings
 * @param workspacePath - Path to workspace
 * @returns Workspace settings
 */
export function getWorkspaceSettings(workspacePath: string): WorkspaceSettings;

/**
 * Get VS Code workspace file information
 * @param workspacePath - Path to workspace
 * @returns Workspace file information
 */
export function getWorkspaceInfo(workspacePath: string): WorkspaceInfo;

/**
 * Get VS Code launch configurations
 * @param workspacePath - Path to workspace
 * @returns Launch configurations
 */
export function getLaunchConfigurations(workspacePath: string): LaunchConfigurations;

/**
 * Get VS Code extensions recommended for the workspace
 * @param workspacePath - Path to workspace
 * @returns Recommended extensions
 */
export function getRecommendedExtensions(workspacePath: string): RecommendedExtensions;
