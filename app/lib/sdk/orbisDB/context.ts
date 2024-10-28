interface OrbisContextProps {
    authResult: OrbisConnectResult | null;
    setAuthResult: React.Dispatch<React.SetStateAction<OrbisConnectResult | null>>;
    insert: (modelId: string, tableName: string) => Promise<null>;
    update: (docId: string, updates: any) => Promise<void>;
    login: () => Promise<void>;
    isConnected: (address: string) => Promise<Bool>;
    getCurrentUser: () => Promise<any>;
}

const OrbisContext = createContext<OrbisContextProps | undefined>(undefined);

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
        const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);

    const insert = async (modelId: string = null, tableName: string = null): Promise<null> => {
        if (!modelId && !tableName) { 
            throw new Error('No modelId or tableName provided. Please provide a modelId or tableName.')
        };

        if (!value) {
            throw new Error('No value provided. Please provide a value to insert.')
        }

        const insertStatement = await orbis
            .insert(modelId ? modelId : tableName)
            .value(
                value
            )
            // optionally, you can scope this insert to a specific context
            .context(crtvEnvId);

            // Perform local JSON Schema validation before running the query
        const validation = await insertStatement.validate()

        if(!validation.valid){
            throw "Error during validation: " + validation.error
        }

        const [result, error] = await catchError(() => insertStatement.run())

        if (error) {
            console.error(error);
        }

        // All runs of a statement are stored within the statement, in case you want to reuse the same statmenet
        console.log(insertStatement.runs)
    }

    const update = async (docId: string, updates: any): Promise<void> => {
        // This will perform a shallow merge before updating the document 
        // { ...oldContent, ...newContent }
        const updateStatement = await orbis
        .update(docId)
        .set(
            updates
        )

        const [result, error] = await catchError(() => updateStatement.run())

        if (error) {
            console.error(error);
        }

        // All runs of a statement are stored within the statement, in case you want to reuse the same statmenet
        console.log(updateStatement.runs)
    }

    const login = async (): Promise<void> => {
        // Browser provider
        const provider = window.ethereum;

        // Ethers provider
        // const provider = new Wallet(...)

        // Orbis Authenticator
        const auth = new OrbisEVMAuth(provider);

        // Authenticate the user and persist the session in localStorage
        const authResult: OrbisConnectResult = await db.connectUser({ auth });

        // Log the result
        console.log({ authResult })
    }

    const isConnected = async (address: string = null): Promise<Bool> => {

        // Check if any user is connected
        const connected = await orbis.isUserConnected(address ? address : null);

        console.log({ connected });

        return connected;
    }

    const getCurrentUser = async (): Promise<any> => {
        // Get the currently connected user
        const currentUser = await orbis.getConnectedUser()
        if(!currentUser){
            // Notify the user or reconnect
            console.log("There is no active user session.");
        }

        console.log({ currentUser });

        return currentUser;
    }

    return (
        <OrbisContext.Provider value={{ 
            authResult,
            setAuthResult,
            insert,
            update,
            login,
            isConnected,
            getCurrentUser
        }}>
            {children}
        </OrbisContext.Provider>
    );
};

export const useOrbisContext = () => {
    const context = useContext(OrbisContext);
    if (context === undefined) {
        throw new Error('useOrbisContext must be used within a OrbisProvider');
    }
    return context;
};