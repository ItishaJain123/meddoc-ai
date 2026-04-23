import { SignUp } from '@clerk/clerk-react';
import styles from './AuthPage.module.css';

function SignUpPage() {
  return (
    <div className={styles.container}>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}

export default SignUpPage;
