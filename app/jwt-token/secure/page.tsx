import { authedOnly } from '@app/api/auth/thirdweb/authentication';
import { LogOutButton } from '@app/components/Button/logout-button';

const AuthenticatedPage = async () => {
  const parsedJWT = await authedOnly();

  return (
    <div>
      <h1>Authenticated Page</h1>
      <p>You are authenticated, {parsedJWT.sub}!</p>
      <hr />
      <LogOutButton />
    </div>
  );
};

export default AuthenticatedPage;
