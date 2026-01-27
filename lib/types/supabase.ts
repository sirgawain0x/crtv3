export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            // Add tables here if needed
        }
        Views: {
            // Add views here if needed
        }
        Functions: {
            // Add functions here if needed
        }
        Enums: {
            // Add enums here if needed
        }
    }
}