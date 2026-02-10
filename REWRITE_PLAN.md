# Full Rewrite Plan - Rapid Bus PWA

## Critical Issues Found

### 1. Critical Bugs
- **Bus filtering broken**: Route ID mismatch between routes.json (numeric IDs) vs API (shortNames like "T401")
- **ETA calculations broken**: routeLogic.ts has flawed distance/time calculations
- **Alerts only work for active route**: useAlertChecker only checks selectedRoute
- **404 errors**: API trying to fetch null.json for route details

### 2. Accessibility Issues
- Missing DialogTitle in all dialogs
- Missing form IDs and labels
- Missing aria descriptions

### 3. Data Structure Issues
- Route ID inconsistency across the app
- Empty headsigns in GTFS data
- No proper trip grouping

### 4. Code Quality Issues
- No error boundaries
- Missing loading states
- Magic numbers everywhere
- No TypeScript strict mode

### 5. Performance Issues
- 10s polling without smart logic
- Missing memoization
- No request deduplication

### 6. Missing Features
- No user location tracking
- No offline support
- No favorites/bookmarks

## Rewrite Strategy

### Phase 1: Fix Data Layer (PRIORITY)
1. Fix route ID mapping (routes.json numeric ID → API shortName)
2. Fix GTFS data structure (headsigns, trip grouping)
3. Add proper TypeScript types

### Phase 2: Fix Core Logic
1. Rewrite ETA calculation logic
2. Fix bus filtering logic
3. Fix alerts system to work globally

### Phase 3: Fix UI/UX
1. Add proper error boundaries
2. Add loading states
3. Fix accessibility issues
4. Add user location

### Phase 4: Performance & Polish
1. Add proper memoization
2. Implement smart polling
3. Add offline support
4. Add favorites

## Implementation Order

1. ✅ Create branch
2. Fix lib/routeLogic.ts (ETA calculations)
3. Fix app/api/buses/route.ts (route filtering)
4. Fix hooks/useAlertChecker.ts (global alerts)
5. Fix app/page.tsx (main logic)
6. Fix components/Map.tsx (bus markers)
7. Add accessibility fixes
8. Add error boundaries
9. Add user location feature
10. Performance optimizations
