'use client';
import React, { useState, useRef } from 'react';
import {
  Box,
  Heading,
  Input,
  Textarea,
  Button,
  Stack,
  InputGroup,
  InputRightElement,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import snapshot from '@snapshot-labs/snapshot.js';
import { useActiveAccount } from 'thirdweb/react';
import { FaWindowClose } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { polygon } from 'thirdweb/chains';
import { SNAPSHOT_SUBGRAPH_URL } from '@snapshot-labs/snapshot.js/dist/utils';

const hub = 'https://hub.snapshot.org';
const client = new snapshot.Client(hub);

/**
 * Renders the Create component.
 *
 * @returns The JSX element representing the Create component.
 */
export default function Create() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState(0);
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(0);
  const [endTime, setEndTime] = useState(new Date());
  const [choices, setChoices] = useState(['yes', 'no']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef();
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const chain = polygon;

  /**
   * Handles the change event for a choice input field.
   *
   * @param i - The index of the choice in the array.
   * @param event - The change event object.
   */
  function handleChange(i: any, event: any) {
    const values = [...choices];
    values[i] = event.target.value;
    setChoices(values);
  }

  /**
   * Adds an empty choice to the list of choices.
   */
  function handleAdd() {
    const values = [...choices];
    values.push('');
    setChoices(values);
  }

  /**
   * Removes a choice from the list of choices.
   *
   * @param i - The index of the choice to remove.
   */
  function handleRemove(i: any) {
    const values = [...choices];
    values.splice(i, 1);
    setChoices(values);
  }

  /**
   * Submits a vote proposal.
   *
   * @returns {Promise<void>} A promise that resolves when the proposal is created.
   */
  const submit = async () => {
    if (activeAccount) {
      try {
        setIsSubmitting(true);
        // get current block of Polygon network
        const provider = await snapshot.utils.getProvider(chain.id.toString());
        const block = await snapshot.utils.getBlockNumber(provider);
        const space = 'thecreative.eth';
        const receipt = (await client.proposal(provider, activeAccount?.address, {
          space: space,
          type: 'weighted',
          title: title,
          body: content,
          choices: choices,
          start: startDate,
          end: endDate,
          snapshot: block,
          discussion: 'max',
          plugins: JSON.stringify({
            poap:{}
          }),
        })) as any;
        console.log(`created proposal ${receipt.id}`);
        router.push('/vote');
      } catch (error) {
        console.log(error);
        setIsSubmitting(false);
      }
    } else {
      console.log('Please connect your wallet to create a proposal.');
    }
  };

  const changeInput = (event: any, type: string) => {
    if (type === 'title') {
      setTitle(event.target.value);
    } else if (type === 'content') {
      setContent(event.target.value);
    } else if (type === 'start date') {
      setStartDate(event.target.value);
    } else if (type === 'start time') {
      setStartTime(event.target.value);
    } else if (type === 'end time') {
      setEndTime(event.target.value);
    } else if (type === 'end date') {
      setEndDate(event.target.value);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="row"
      flexWrap="wrap"
      alignItems="flex-start"
      justifyContent="center"
      padding={2}
    >
      <Box padding={5} width={['100%', '100%', '100%', '40%']}>
        <Breadcrumb
          spacing="8px"
          mb={4}
          separator={<ChevronRightIcon color="gray.500" />}
        >
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <span role="img" aria-label="home">
                🏠
              </span>{' '}
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem>
            <BreadcrumbLink href="/vote">Vote</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Create</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <Box marginBottom={4} cursor="pointer">
          <Box
            padding={4}
            borderTopRadius={20}
            bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
          >
            <Heading size="md" color="white">
              Title
            </Heading>
          </Box>
          <Box
            background={'brand.100'}
            padding={4}
            borderBottomRadius={20}
            border={'1px solid #EC407A'}
          >
            <Input
              fontWeight={'bold'}
              placeholder="[#BrandName] Campaign Voting"
              background={'default'}
              onChange={(event) => {
                changeInput(event, 'title');
              }}
            />
          </Box>
        </Box>
        <Box marginBottom={4} cursor="pointer">
          <Box
            padding={4}
            borderTopRadius={20}
            bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
          >
            <Heading color="white" size="md">
              Content
            </Heading>
          </Box>
          <Box
            background={'brand.100'}
            padding={4}
            borderBottomRadius={20}
            border={'1px solid #EC407A'}
          >
            <Textarea
              background={'default'}
              placeholder="Here is a sample placeholder"
              onChange={(event) => {
                changeInput(event, 'content');
              }}
            />
          </Box>
        </Box>
        <Box marginBottom={4} cursor="pointer">
          <Box
            padding={4}
            borderTopRadius={20}
            bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
          >
            <Heading color={'white'} size="md">
              Choices
            </Heading>
          </Box>
          <Box
            background={'brand.100'}
            padding={4}
            borderBottomRadius={20}
            border={'1px solid #EC407A'}
          >
            <Stack spacing={4}>
              <form>
                {choices.map((field, index) => {
                  return (
                    <InputGroup key={index}>
                      <Input
                        marginBottom={5}
                        className="choices"
                        background={'default'}
                        placeholder="Enter Choice"
                        value={field || ''}
                        onChange={(e) => handleChange(index, e)}
                      />
                      <InputRightElement>
                        <Box onClick={() => handleRemove(index)}>
                          <FaWindowClose />
                        </Box>
                      </InputRightElement>
                    </InputGroup>
                  );
                })}
              </form>
            </Stack>

            <Button
              marginTop={4}
              color={'white'}
              _hover={{ background: '#A62953' }}
              _focus={{ background: '#A62953' }}
              background={'#EC407A'}
              onClick={() => handleAdd()}
            >
              <Heading color="white" size="sm">
                Add
              </Heading>
            </Button>
          </Box>
        </Box>
      </Box>
      <Box mt={10} padding={5} width={['100%', '100%', '100%', '40%']}>
        <Box
          padding={4}
          borderTopRadius={20}
          bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
          cursor="pointer"
        >
          <Heading color="white" size="md">
            Actions
          </Heading>
        </Box>
        <Box
          background={'brand.100'}
          padding={4}
          borderBottomRadius={20}
          border={'1px solid #EC407A'}
        >
          <Heading color="white" size="sm">
            Start Date
          </Heading>
          <Input
            type="date"
            background={'default'}
            onChange={(event) => {
              changeInput(event, 'start date');
            }}
          />
          <Heading marginTop={4} color="white" size="sm">
            Start time
          </Heading>
          <Input
            type="time"
            background={'default'}
            onChange={(event) => {
              changeInput(event, 'start time');
            }}
          />
          <Heading marginTop={4} color="white" size="sm">
            End date
          </Heading>
          <Input
            type="date"
            background={'default'}
            onChange={(event) => {
              changeInput(event, 'end date');
            }}
          />
          <Heading marginTop={4} color="white" size="sm">
            End time
          </Heading>
          <Input
            type="time"
            background={'default'}
            onChange={(event) => {
              changeInput(event, 'end time');
            }}
          />
          <Button
            isLoading={isSubmitting}
            marginTop={4}
            color={'white'}
            _hover={{ background: '#A62953' }}
            _focus={{ background: '#A62953' }}
            background={'#EC407A'}
            onClick={() => submit()}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
