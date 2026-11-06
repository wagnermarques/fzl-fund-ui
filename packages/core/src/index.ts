/**
 * @fzl/core — Shared widget infrastructure, base utilities, utility classes,
 * accessibility (a11y), and mixins for FZL Web Components.
 *
 * Architecturally inspired by Dojo Toolkit's Dijit widget system
 * (Registry, FocusManager, Typematic, Place/Popup, A11y/HighContrast,
 * _WidgetBase, _CssStateMixin, _FocusMixin, _KeyNavContainer).
 */

export { fzlRegistry, type FzlRegistrableWidget } from './registry';
export { fzlA11y, type FzlA11yEnvironment } from './a11y';
export { fzlFocus, type FzlFocusSubscriber } from './focus';
export {
  FzlTypematicController,
  addTypematicListener,
  fzlTypematic,
  type FzlTypematicCallback,
  type FzlTypematicOptions,
} from './typematic';
export {
  fzlPlace,
  fzlPopup,
  type FzlPlaceResult,
  type FzlPlacementPosition,
  type FzlPopupEntry,
} from './place';
export {
  FzlWidgetController,
  FzlWidgetMixin,
  FzlKeyNavController,
  type Constructor,
  type FzlCleanupHandle,
  type FzlKeyNavOptions,
  type FzlWidgetInterface,
  type FzlWidgetLifecycleElement,
} from './mixins';
export {
  FzlMemoryStore,
  type FzlStore,
  type FzlId,
  type FzlStoreChangeEvent,
  type FzlStoreObserver,
  type FzlQuerySort,
  type FzlQueryOptions,
  type FzlQueryPredicate,
  type FzlQueryResults,
} from './store';
