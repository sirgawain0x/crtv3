import React from 'react';
import { Container } from '@chakra-ui/react';
import Vote from '@app/components/Voting/Index';

export default function VotePage() {
  return (
    <Container maxW="container.7xl">
      <Vote />
    </Container>
  );
}
