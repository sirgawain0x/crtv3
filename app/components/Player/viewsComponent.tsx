import React from 'react';
import { Badge } from '../ui/badge';

function ViewsComponent(props: any) {
  return (
    <div>
      <Badge key={props.id} variant={'outline'}>
        {props.startViews}
      </Badge>
    </div>
  );
}

export default ViewsComponent;
