import { defineNavigator, createVueNavigator } from '@mariner/kit'
import { createApp } from 'vue'
import './style.css'
import App from './src/App.vue'

export default defineNavigator({ navigator: createVueNavigator(createApp(App)) })
