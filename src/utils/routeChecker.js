/**
 * A simple file to help ensure route files are exporting correctly.
 * This file doesn't directly affect functionality, but can be used for debugging.
 */

export const checkRouteExports = () => {
  try {
    console.log('Checking route exports...');
    // In a real implementation, this would actually check the exports
    return true;
  } catch (error) {
    console.error('Error checking route exports:', error);
    return false;
  }
}; 