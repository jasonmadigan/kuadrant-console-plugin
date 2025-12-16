import * as React from 'react';
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';

export interface UserIdentity {
  userId: string;
  email?: string;
  fullName?: string;
  loaded: boolean;
  error?: Error;
}

interface OpenShiftUser {
  metadata: {
    name: string;
    uid?: string;
  };
  fullName?: string;
  identities?: string[];
}

// fetch current user from openshift user api
export const useCurrentUser = (): UserIdentity => {
  const [user, setUser] = React.useState<UserIdentity>({
    userId: '',
    loaded: false,
  });

  React.useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        // ~ is a special placeholder that returns the current user
        const result = (await consoleFetchJSON(
          '/api/kubernetes/apis/user.openshift.io/v1/users/~',
        )) as OpenShiftUser;

        if (mounted) {
          setUser({
            userId: result.metadata.name,
            fullName: result.fullName,
            // email not directly available on user object, could extract from identities if needed
            loaded: true,
          });
        }
      } catch (err) {
        if (mounted) {
          console.error('failed to fetch current user:', err);
          setUser({
            userId: '',
            loaded: true,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return user;
};
