import { createVueNavigator } from 'mariner/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'

export const navigator = createVueNavigator(createApp(App))
