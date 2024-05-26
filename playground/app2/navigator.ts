import { createVueNavigator } from 'mariner-io/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'
import { pinia } from 'navigator:shared'
import 'navigator:js-test'

console.log('SOMETHING', pinia)

const app = createApp(App)

app.use(pinia)

export const navigator = createVueNavigator(app)
