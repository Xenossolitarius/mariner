// import 'vite/modulepreload-polyfill'
import { defineNavigator, createVueNavigator } from 'mariner/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'

export default defineNavigator({ navigator: createVueNavigator(createApp(App)) })

export const more = defineNavigator({ navigator: createVueNavigator(createApp(App)) })
