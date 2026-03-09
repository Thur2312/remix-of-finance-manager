import { Request } from "express"

export interface AuthUser {
  id: string
}

export interface AuthenticatedRequests extends Request {
 
}