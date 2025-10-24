# Lessons Learned: Implementing Custom Perspectives in OpenShift Console Plugins

## Key Discovery

Custom perspectives in OpenShift Console dynamic plugins require a specific pattern when using JSON-based configuration (`console-extensions.json`). The implementation differs significantly from other extension types.

## The Correct Pattern

### 1. Single Module with Named Exports

Create a single TypeScript file that exports all perspective-related properties as named exports:

```typescript
// src/components/perspective.tsx
import { CubeIcon } from '@patternfly/react-icons/dist/esm/icons/cube-icon';
import { Perspective, ResolvedExtension } from '@openshift-console/dynamic-plugin-sdk';

// icon must be an object with a 'default' property, not just the component
export const icon: ResolvedExtension<Perspective>['properties']['icon'] = {
  default: CubeIcon
};

export const getLandingPageURL: ResolvedExtension<Perspective>['properties']['landingPageURL'] = (
  _flags,
  _isFirstVisit,
) => '/api-management/all-namespaces';

export const getImportRedirectURL: ResolvedExtension<Perspective>['properties']['importRedirectURL'] = (
  namespace,
) => namespace ? `/api-management/ns/${namespace}` : '/api-management/all-namespaces';
```

### 2. Expose as Single Module in package.json

```json
{
  "consolePlugin": {
    "exposedModules": {
      "perspective": "./components/perspective"
    }
  }
}
```

### 3. Reference with Dot Notation in console-extensions.json

```json
{
  "type": "console.perspective",
  "properties": {
    "id": "apimanagement",
    "name": "%plugin__kuadrant-console-plugin~API Management%",
    "icon": { "$codeRef": "perspective.icon" },
    "landingPageURL": { "$codeRef": "perspective.getLandingPageURL" },
    "importRedirectURL": { "$codeRef": "perspective.getImportRedirectURL" }
  }
}
```

## What Doesn't Work

### ❌ Separate Modules for Each Property

```json
// This pattern FAILS
"exposedModules": {
  "ApiManagementIcon": "./components/ApiManagementIcon",
  "getApiManagementLandingPageURL": "./components/getApiManagementLandingPageURL",
  "getApiManagementRedirectURL": "./components/getApiManagementRedirectURL"
}
```

```json
// This causes crashes
{
  "icon": { "$codeRef": "ApiManagementIcon" },
  "landingPageURL": { "$codeRef": "getApiManagementLandingPageURL" },
  "importRedirectURL": { "$codeRef": "getApiManagementRedirectURL" }
}
```

### ❌ Direct Component Export for Icon

```typescript
// This FAILS - icon must be { default: Component }
export const icon = CubeIcon;  // Wrong
export const icon = () => <CubeIcon />;  // Wrong
export const icon = { default: CubeIcon };  // Correct
```

## Why This Pattern is Required

1. **Icon Property**: The console expects an object with a `default` property containing the component, not the component itself. This allows for lazy loading and proper module federation.

2. **Dot Notation**: The `$codeRef` syntax with dot notation (`"perspective.icon"`) tells the console to:
   - Load the `perspective` module
   - Access the named export `icon` from that module

3. **Single Module**: Grouping all perspective properties in one module ensures they're loaded together and share any common dependencies or state.

## Reference Implementation

The OpenShift Console's built-in Developer perspective (`dev-console` package) uses this exact pattern:

- Module: `frontend/packages/dev-console/src/utils/perspective.tsx`
- Package.json: `"perspective": "src/utils/perspective.tsx"`
- Console-extensions.json: `"icon": { "$codeRef": "perspective.icon" }`

## TypeScript Type Safety

Using `ResolvedExtension<Perspective>['properties']['icon']` provides type safety:

```typescript
export const icon: ResolvedExtension<Perspective>['properties']['icon'] = {
  default: CubeIcon
};
```

This ensures the exported value matches what the console expects at runtime.

## Common Pitfalls

1. **Missing default wrapper**: Exporting icon component directly instead of wrapping in `{ default: Component }`
2. **Separate modules**: Treating each property as an independent module
3. **Wrong CodeRef syntax**: Using simple references instead of dot notation
4. **Function signatures**: Not matching the exact function signatures expected by the Perspective type

## Debugging Tips

1. If the perspective switcher crashes without console errors, the icon is likely not in the correct format
2. If you see "TypeError: t is not a function", the landingPageURL or importRedirectURL functions aren't being resolved correctly
3. Check webpack output for exposed modules - you should see `exposed-perspective-chunk.js`, not separate chunks for each property
4. Use browser's network tab to verify the plugin-manifest.json contains the correct CodeRef paths

## Documentation Gap

As of October 2024, the official OpenShift Console documentation doesn't clearly explain this pattern for JSON-based perspective definitions. The only working examples are in the core console codebase itself (dev-console, admin-console).

## Summary

Custom perspectives in JSON-based plugins require:
- Single module with named exports
- Icon as `{ default: Component }` object
- Dot notation in CodeRefs
- Exact type signatures matching ResolvedExtension<Perspective>

This pattern differs from TypeScript-based plugins (`plugin.tsx`) which can define perspectives inline.
