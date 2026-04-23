import { SignIn } from '@clerk/clerk-react';
import styles from './AuthPage.module.css';

function SignInPage() {
  return (
    <div className={styles.container}>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  );
}

export default SignInPage;
