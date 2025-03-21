'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Generate 50 mock users
const generateMockUsers = () => {
  const users = [];
  for (let i = 1; i <= 50; i++) {
    const firstName = [
      'John',
      'Jane',
      'Alex',
      'Maria',
      'Sam',
      'Emma',
      'Michael',
      'Sarah',
      'David',
      'Lisa',
    ][i % 10];
    const lastName = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Miller',
      'Davis',
      'Garcia',
      'Rodriguez',
      'Wilson',
    ][i % 10];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const role = ['Admin', 'Editor', 'Viewer', 'Manager', 'Contributor'][i % 5];
    const status = ['Active', 'Inactive', 'Pending'][i % 3];
    const createdAt = new Date(2023, i % 12, (i % 28) + 1);

    users.push({
      id: i,
      name,
      email,
      role,
      status,
      createdAt,
      documents: Math.floor(Math.random() * 20),
    });
  }
  return users;
};

const mockUsers = generateMockUsers();

export default function DocumentsPage() {
  return (
    <InternalPage title="Documents" subtitle="Manage your documents">
      {/* Table with 50 mock users to create scrollable content */}
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-full table-fixed">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Documents
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user, index) => (
                <tr key={user.id} className={`border-t ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                        />
                        <AvatarFallback>
                          {user.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.role}</td>
                  <td className="px-4 py-3">
                    <div
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : user.status === 'Inactive'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {user.status}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.documents}</td>
                  <td className="px-4 py-3 text-sm">{format(user.createdAt, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </InternalPage>
  );
}
