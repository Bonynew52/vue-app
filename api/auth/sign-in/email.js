import { toNodeHandler } from 'better-auth/node'
import { auth } from '../../../auth.js'

export default toNodeHandler(auth.handler)
