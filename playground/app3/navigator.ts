import { createReactNavigator } from 'mariner-io/navigator';
import { NavigatorApp } from './src/main-navigator'
import ReactDOM from 'react-dom/client'

export const navigator = createReactNavigator(ReactDOM.createRoot,NavigatorApp())