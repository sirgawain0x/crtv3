'use client';
import React from 'react';
import { Progress } from '../ui/progress';

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
            <div
              className='display="flex" flexDirection="column" marginTop={4} cursor="pointer"'
              key={item}
            >
              <p>{item}</p>
              <Progress value={number} className="mt-4" />
            </div>
          );
        })
      ) : (
        <p>No choices available.</p>
      )}
    </>
  );
};
