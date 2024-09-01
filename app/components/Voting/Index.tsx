'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import Link from 'next/link';
import { FaUsers, FaCertificate } from 'react-icons/fa';
import { useActiveAccount } from 'thirdweb/react';
import { Label } from '../ui/label';
import { ROLES, CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { Card } from '@app/components/Voting/Card';
import { gql, useQuery } from '@apollo/client';

// GraphQL query to fetch proposals
const GET_PROPOSALS = gql`
  query {
    proposals(
      first: 50
      skip: 0
      where: { space_in: ["thecreative.eth"] }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      title
      body
      choices
      start
      end
      snapshot
      state
      scores
      scores_by_strategy
      scores_total
      scores_updated
      author
      type
      quorum
      space {
        id
        name
      }
    }
  }
`;

// Interface for proposal data
interface Proposal {
  id: string;
  title: string;
  body: string;
  start: number; // assuming timestamp
  end: number; // assuming timestamp
  snapshot: any; // specify more precise types if possible
  state: string;
  scores: any; // specify more precise types if possible
  scores_total: number;
  author: string;
  type: string;
  quorum: any; // specify more precise types if possible
  space: {
    id: string;
    name: string;
  };
  choices: any[]; // specify more precise types if possible
}

const Vote = () => {
  const activeAccount = useActiveAccount();
  const { loading, error, data } = useQuery(GET_PROPOSALS);
  const proposals: Proposal[] = useMemo(
    () => (data ? data.proposals : []),
    [data],
  );

  // Explicitly declare the type of state variable as Proposal[]
  const [snapshots, setSnapshots] = useState<Proposal[]>([]);

  const [selectionType, setSelectionType] = useState([false, false, true]);
  const [value, setValue] = useState('closed');

  const handleTypeChange = (id: number) => {
    setSelectionType(selectionType.map((_, index) => index === id));
  };

  const convertDate = (date: number) => new Date(date * 1000).toUTCString();

  useEffect(() => {
    const reset = () =>
      setSnapshots(proposals.filter((item) => item.state === value));
    const filterCore = () =>
      setSnapshots(
        proposals.filter(
          (item) => item.author === CREATIVE_ADDRESS && item.state === value,
        ),
      );
    const filterCommunity = () =>
      setSnapshots(
        proposals.filter(
          (item) => item.author !== CREATIVE_ADDRESS && item.state === value,
        ),
      );

    if (selectionType[0]) {
      filterCore();
    } else if (selectionType[1]) {
      filterCommunity();
    } else {
      reset();
    }
  }, [proposals, selectionType, value]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <>
      {activeAccount && (
        <div className="mt-5">
          <Link href={'/vote/create'}>
            <Button className="rounded bg-pink-500 p-5 text-white hover:bg-pink-600 focus:bg-pink-600">
              <h2 className="text-sm font-bold">Make a Proposal</h2>
            </Button>
          </Link>
        </div>
      )}
      <div className="pt-10">
        <div>
          <div>
            <h1 className="text-xl font-bold">Proposals</h1>
          </div>
          <div className="mt-5 flex min-w-[40vw] flex-row rounded-t-lg bg-gradient-to-l from-yellow-300 via-red-600 to-pink-500 p-2">
            <div
              className={`m-2 flex min-w-10 cursor-pointer flex-row items-center justify-center rounded-lg p-2 ${selectionType[0] ? 'bg-white' : 'bg-brand-400'}`}
              onClick={() => handleTypeChange(0)}
            >
              <FaCertificate color={selectionType[0] ? '#ec407a' : 'white'} />
              <p
                className={`ml-2 ${selectionType[0] ? 'text-pink-500' : 'text-white'}`}
              >
                Core
              </p>
            </div>
            <div
              className={`m-2 flex min-w-10 cursor-pointer flex-row items-center justify-center rounded-lg p-2 ${selectionType[1] ? 'bg-white' : 'bg-pink-500'}`}
              onClick={() => handleTypeChange(1)}
            >
              <FaUsers color={selectionType[1] ? '#ec407a' : 'white'} />
              <p
                className={`ml-2 ${selectionType[1] ? 'text-pink-500' : 'text-white'}`}
              >
                Community
              </p>
            </div>
            <div
              className={`m-2 flex min-w-10 cursor-pointer flex-row items-center justify-center rounded-lg p-2 ${selectionType[2] ? 'bg-white' : 'bg-pink-500'}`}
              onClick={() => handleTypeChange(2)}
            >
              <p className={`text-${selectionType[2] ? 'pink-500' : 'white'}`}>
                All
              </p>
            </div>
          </div>
          <div className="flex min-w-[40vw] flex-col border-2 border-solid border-pink-500 p-2">
            <RadioGroup
              onValueChange={setValue}
              defaultValue={value}
              className="flex flex-row space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="text-black">
                  Vote Now
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending" className="text-black">
                  Soon
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="closed" id="closed" />
                <Label htmlFor="closed" className="text-black">
                  Closed
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="rounded-b-3xl border-2 border-pink-500 p-5">
            {snapshots.map((data) => (
              <Card
                core={data.author === CREATIVE_ADDRESS}
                key={data.id}
                title={data.title}
                body={data.body}
                state={data.state}
                start={convertDate(data.start)}
                choices={data.choices}
                end={convertDate(data.end)}
                score={data.scores_total}
                scores={data.scores}
                creator={data.author}
                identifier={data.id}
                snapshot={data.snapshot}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
export default Vote;
