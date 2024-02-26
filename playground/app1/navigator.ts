import { createVueNavigator } from 'mariner/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'
import { pinia } from 'navigator:shared'

const app = createApp(App)

app.use(pinia)

export const navigator = createVueNavigator(createApp(App))
