import { Router } from 'express'
import { generateKatha } from '../controllers/storyController.js'

export const storyRoutes = Router()

storyRoutes.post('/generate-katha', generateKatha)

