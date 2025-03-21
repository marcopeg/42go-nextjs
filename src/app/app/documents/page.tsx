'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  FileText,
  FileJson,
  FileImage,
  File,
  MoreVertical,
  Eye,
  Download,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type DocumentType = 'pdf' | 'doc' | 'image' | 'json';
type DocumentStatus = 'Draft' | 'Published' | 'Archived' | 'Under Review';

interface DocumentOwner {
  name: string;
  email: string;
}

interface Document {
  id: number;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: Date;
  owner: DocumentOwner;
  size: string;
}

// Generate 30 mock documents
const generateMockDocuments = (): Document[] => {
  const documents: Document[] = [];
  const documentTypes: DocumentType[] = ['pdf', 'doc', 'image', 'json'];
  const statuses: DocumentStatus[] = ['Draft', 'Published', 'Archived', 'Under Review'];
  const titles = [
    'Annual Report',
    'Project Proposal',
    'Meeting Minutes',
    'Financial Statement',
    'User Research',
    'Marketing Plan',
    'Product Roadmap',
    'Employee Handbook',
    'Contract Agreement',
    'Technical Documentation',
  ];

  const users: DocumentOwner[] = [
    { name: 'John Smith', email: 'john.smith@example.com' },
    { name: 'Jane Johnson', email: 'jane.johnson@example.com' },
    { name: 'Alex Williams', email: 'alex.williams@example.com' },
    { name: 'Maria Brown', email: 'maria.brown@example.com' },
    { name: 'Sam Jones', email: 'sam.jones@example.com' },
  ];

  for (let i = 1; i <= 30; i++) {
    const title = `${titles[i % 10]} ${i}`;
    const type = documentTypes[i % 4];
    const status = statuses[i % 4];
    const createdAt = new Date(2023, i % 12, (i % 28) + 1);
    const owner = users[i % 5];
    const size = `${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 9) + 1} MB`;

    documents.push({
      id: i,
      title,
      type,
      status,
      createdAt,
      owner,
      size,
    });
  }

  return documents;
};

const mockDocuments = generateMockDocuments();

// Helper function to get the appropriate icon based on document type
const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'pdf':
      return <File className="h-8 w-8 text-red-500" />;
    case 'doc':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'image':
      return <FileImage className="h-8 w-8 text-green-500" />;
    case 'json':
      return <FileJson className="h-8 w-8 text-yellow-500" />;
    default:
      return <FileText className="h-8 w-8 text-gray-500" />;
  }
};

// Helper function to get status badge color
const getStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case 'Draft':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Published':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'Archived':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case 'Under Review':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

export default function DocumentsPage() {
  return (
    <InternalPage title="Documents" subtitle="Manage your documents">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockDocuments.map(doc => (
          <div
            key={doc.id}
            className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getDocumentIcon(doc.type)}
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground">{doc.size}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>View</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Download</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      getStatusColor(doc.status)
                    )}
                  >
                    {doc.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(doc.createdAt, 'MMM d, yyyy')}
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${doc.owner.name}`}
                  />
                  <AvatarFallback>
                    {doc.owner.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs truncate">{doc.owner.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </InternalPage>
  );
}
