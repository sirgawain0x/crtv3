# Hex Converter Script

This script converts specific environment variables into 32-byte hex strings using SHA-256 hashing. The converted values are then updated in the process environment.

## Prerequisites

1. **Node.js and npm**: Ensure you have Node.js and npm installed on your system.
2. **Environment Variables**: Set up the following environment variables in your `.env` file or directly in your environment:

   ```
   THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
   THIRDWEB_ADMIN_PRIVATE_KEY=your_thirdweb_admin_private_key
   LIVEPEER_FULL_API_KEY=your_livepeer_full_api_key
   ```

## Usage

1. **Install Dependencies**: If you haven't already, navigate to your project directory and install the required dependencies:

   ```sh
   npm install crypto
   ```

2. **Run the Script**: Execute the script using Node.js:

   ```sh
   npm install -g typescript
   tsc --init
   tsc app/api/auth/utils/hexConverter.ts

   node app/api/auth/utils/hexConverter.js
   ```

3. **Verify Output**: The script will output "Environment variables updated" to the console, indicating that the environment variables have been successfully converted and updated.

## Notes

- **Security**: Ensure that your `.env` file is not exposed in version control systems (e.g., Git) to prevent sensitive information from being leaked.
- **Error Handling**: The script will throw an error if any of the required environment variables are missing. Make sure all necessary variables are set before running the script.

## Contributing

Feel free to contribute to this project by submitting pull requests or issues on the [GitHub repository](https://github.com/your-repo-url).

## License

This project is licensed under the MIT License. See the `LICENSE` file for more information.

```

```
