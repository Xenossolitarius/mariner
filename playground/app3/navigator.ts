import { defineNavigator, createReactNavigator } from 'mariner/navigator';
import { NavigatorApp } from './src/main-navigator'
import ReactDOM from 'react-dom/client'

export default defineNavigator({ navigator: createReactNavigator(ReactDOM.createRoot,NavigatorApp)})