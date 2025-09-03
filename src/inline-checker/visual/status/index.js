/**
 * Status Widget System - Floating status widget with real-time updates
 * Exports StatusWidget and StatusUpdater components
 */

import StatusWidget from '../StatusWidget.js';
import StatusUpdater from '../StatusUpdater.js';

export { StatusWidget, StatusUpdater };

/**
 * Create a complete status system with widget and updater
 */
export function createStatusSystem() {
  const widget = new StatusWidget();
  const updater = new StatusUpdater(widget);
  
  return {
    widget,
    updater,
    
    // Convenience methods
    show: () => widget.show(),
    hide: () => widget.hide(),
    destroy: () => {
      updater.destroy();
      widget.destroy();
    }
  };
}

export default { StatusWidget, StatusUpdater, createStatusSystem };