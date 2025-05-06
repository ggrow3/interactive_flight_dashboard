// Mock authentication service for development
import { User as FirebaseUser } from 'firebase/auth'

// Mock Firebase User type
class MockFirebaseUser implements FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  tenantId: string | null;
  providerId: string;
  metadata: any;
  providerData: any[];
  refreshToken: string;

  constructor(email: string, password: string) {
    this.uid = `mock-user-${Date.now()}`;
    this.email = email;
    this.emailVerified = true;
    this.isAnonymous = false;
    this.displayName = email.split('@')[0];
    this.photoURL = null;
    this.phoneNumber = null;
    this.tenantId = null;
    this.providerId = 'password';
    this.metadata = {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    };
    this.providerData = [];
    this.refreshToken = 'mock-refresh-token';
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  getIdToken(forceRefresh?: boolean): Promise<string> {
    return Promise.resolve('mock-id-token');
  }

  getIdTokenResult(forceRefresh?: boolean): Promise<any> {
    return Promise.resolve({
      token: 'mock-id-token',
      signInProvider: 'password',
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      authTime: new Date().toISOString(),
      claims: {}
    });
  }

  reload(): Promise<void> {
    return Promise.resolve();
  }

  toJSON(): object {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      emailVerified: this.emailVerified
    };
  }
}

// Mock Firebase Auth service
class MockAuth {
  private currentUserValue: MockFirebaseUser | null = null;
  private authStateListeners: Array<(user: MockFirebaseUser | null) => void> = [];
  
  // Valid credentials for testing
  private validCredentials = [
    { email: 'test@example.com', password: 'password123' },
    { email: 'admin@example.com', password: 'admin123' }
  ];

  constructor() {
    // Auto-login with the first user for easy testing
    this.currentUserValue = new MockFirebaseUser('test@example.com', 'password123');
  }
  
  get currentUser(): MockFirebaseUser | null {
    return this.currentUserValue;
  }
  
  signInWithEmailAndPassword(email: string, password: string): Promise<{ user: MockFirebaseUser }> {
    return new Promise((resolve, reject) => {
      // Check if credentials are valid
      const validUser = this.validCredentials.find(
        cred => cred.email === email && cred.password === password
      );
      
      if (validUser) {
        const user = new MockFirebaseUser(email, password);
        this.currentUserValue = user;
        
        // Notify listeners
        this.authStateListeners.forEach(listener => listener(user));
        
        resolve({ user });
      } else {
        reject(new Error('auth/invalid-credential'));
      }
    });
  }
  
  signOut(): Promise<void> {
    return new Promise((resolve) => {
      this.currentUserValue = null;
      
      // Notify listeners
      this.authStateListeners.forEach(listener => listener(null));
      
      resolve();
    });
  }
  
  onAuthStateChanged(listener: (user: MockFirebaseUser | null) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Immediately call with current user
    setTimeout(() => {
      listener(this.currentUserValue);
    }, 0);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }
}

// Export mock Firebase auth functions
export const getMockAuth = (): MockAuth => {
  return new MockAuth();
};

export const signInWithEmailAndPassword = (
  auth: MockAuth,
  email: string,
  password: string
): Promise<{ user: MockFirebaseUser }> => {
  return auth.signInWithEmailAndPassword(email, password);
};

export const signOut = (auth: MockAuth): Promise<void> => {
  return auth.signOut();
};

export const onAuthStateChanged = (
  auth: MockAuth,
  listener: (user: MockFirebaseUser | null) => void
): (() => void) => {
  return auth.onAuthStateChanged(listener);
};