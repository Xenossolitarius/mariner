import { createVueNavigator, useCargo } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'
import { pinia } from 'navigator:shared'

export const cargo = useCargo()

const app = createApp(App)

app.use(pinia)

export const navigator = createVueNavigator(app)
