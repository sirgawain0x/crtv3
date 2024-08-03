import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Slash } from 'lucide-react';
import Vote from '@app/components/Voting/Index';

export default function VotePage() {
  return (
    <div className={'container'}>
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{' '}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>Vote</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <Vote />
    </div>
  );
}
