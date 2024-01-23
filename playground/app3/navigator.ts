import { defineNavigator, createReactNavigator } from "@mariner/kit";
import { NavigatorApp } from './src/main-navigator'
import ReactDOM from 'react-dom/client'

export default defineNavigator({ navigator: createReactNavigator(ReactDOM.createRoot,NavigatorApp)})