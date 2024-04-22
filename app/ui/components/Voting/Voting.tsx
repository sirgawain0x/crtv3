'use client';
import React from 'react';
import {
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  Text,
  Progress,
} from '@chakra-ui/react';

interface VotingProps {
  choices: any[];
  score?: number;
  scores?: any;
}

export const Voting = ({
  choices,
  score,
  scores,
}: {
  choices: any;
  score?: any;
  scores?: any;
}) => {
  const getTotal = (index: any): number => {
    console.log('Scores', scores);
    console.log('Score', score);
    if (scores?.[index] && scores[index] != 0 && score) {
      return (scores[index] / score) * 100;
    }

    return 0;
  };

  return (
    <>
      {Array.isArray(choices) ? (
        choices?.map((item: any, index: any) => {
          const number = getTotal(index);
          return (
            <Box
              key={item}
              display="flex"
              flexDirection="column"
              marginTop={4}
              cursor="pointer"
            >
              <Text>{item}</Text>
              <Progress
                value={number}
                marginTop={4}
                colorScheme="pink"
                size="md"
              />
            </Box>
          );
        })
      ) : (
        <Text>No choices available.</Text>
      )}
    </>
  );
};
