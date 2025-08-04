# Working Time Calculator Extension

A Chrome extension that calculates working time from Zoho People and provides automatic attendance logging functionality.

## Refactored Architecture

The extension has been completely refactored from a monolithic 937-line file into a modular, maintainable architecture with clear separation of concerns.

### Project Structure

```
WorkingTime/
├── js/                          # Core modules directory
│   ├── constants.js             # Configuration constants
│   ├── dom.js                   # DOM element management
│   ├── storage.js               # Chrome storage wrapper
│   ├── chrome-api.js           # Chrome extension API wrapper
│   ├── utils.js                # Utility functions
│   ├── api-service.js          # Zoho API interactions
│   ├── attendance-analyzer.js   # Business logic for attendance analysis
│   ├── time-calculator.js      # Time calculation logic
│   ├── ui-manager.js           # UI operations and messaging
│   ├── attendance-logger.js    # Attendance logging functionality
│   ├── request-limit-manager.js # Request limit management
│   ├── auth-manager.js         # Authentication management
│   ├── app-controller.js       # Main application controller
│   └── index.js                # Tab navigation and routing
├── index.html                  # Main entry point with tabbed interface
├── about.html                  # About page content
├── popup.js                    # Original entry point (8 lines)
├── popup.html                  # Original UI template
├── manifest.json              # Extension manifest
└── icon.png                   # Extension icon
```

### Module Descriptions

#### Core Infrastructure

- **`constants.js`**: Centralized configuration including work hours, time conversions, and thresholds
- **`dom.js`**: DOM element caching and manipulation utilities
- **`storage.js`**: Chrome storage API wrapper for data persistence
- **`chrome-api.js`**: Chrome extension API abstractions for tabs, cookies, and scripting

#### Business Logic

- **`attendance-analyzer.js`**: Core business logic for analyzing attendance data including:
  - Working day validation
  - Hour threshold calculations
  - Absence detection
  - Date filtering for logging
  - Excludes today's date from analysis (calculates up to yesterday only)

- **`time-calculator.js`**: Time calculation algorithms including:
  - Work duration calculations
  - Break time handling
  - Late start adjustments

#### Services

- **`api-service.js`**: Zoho People API integration for:
  - Attendance data retrieval
  - Request submissions
  - Authentication token management

- **`auth-manager.js`**: User authentication and credential management
- **`attendance-logger.js`**: Attendance logging operations
- **`request-limit-manager.js`**: Request quota management and validation

#### User Interface

- **`ui-manager.js`**: UI state management including:
  - Message display system
  - Modal operations
  - Button state management
  - Interface switching

- **`app-controller.js`**: Main application orchestration and event handling

#### Navigation and Routing

- **`index.js`**: Tab navigation controller and routing logic

#### Entry Points

- **`index.html`**: Main tabbed interface with Home and About tabs
- **`popup.js`**: Original minimal entry point that initializes the application

### Key Improvements

1. **Modularity**: Each module has a single responsibility
2. **Maintainability**: Code is easier to understand, test, and modify
3. **Reusability**: Modules can be reused across different parts of the application
4. **Testability**: Individual modules can be unit tested in isolation
5. **Performance**: Only necessary code is loaded and executed
6. **ES6 Features**: Modern JavaScript features including modules, classes, and async/await

### Dependencies

The modules have a clear dependency hierarchy:

```
index.js → app-controller.js
└── app-controller.js
    ├── auth-manager.js → storage.js, chrome-api.js
    ├── api-service.js
    ├── attendance-analyzer.js → constants.js, utils.js
    ├── time-calculator.js → constants.js, utils.js
    ├── ui-manager.js → constants.js, dom.js, utils.js
    ├── attendance-logger.js → api-service.js, storage.js
    ├── request-limit-manager.js → constants.js, storage.js, dom.js, ui-manager.js
    └── utils.js → constants.js
```

### Usage

The extension opens with a tabbed interface featuring:

#### **Home Tab** (Default)
1. **Time Calculation**: Calculates current work duration and end time
2. **Attendance Analysis**: Analyzes historical attendance data
3. **Auto Logging**: Automatically selects and logs attendance for optimal dates
4. **Manual Logging**: Provides interface for selective attendance logging
5. **Request Management**: Tracks and manages attendance request limits

#### **About Tab**
- Extension overview and features
- Usage instructions
- Work hours configuration details
- Support Development Team section with QR code for donations
- Architecture information

### Development

To extend the extension:

1. **Add new features**: Create focused modules in the `js/` directory
2. **Modify business logic**: Update the appropriate analyzer or calculator module
3. **Change UI behavior**: Modify the `ui-manager.js` or `app-controller.js`
4. **Add new API endpoints**: Extend the `api-service.js` module

The modular architecture makes it easy to add new features without affecting existing functionality.
