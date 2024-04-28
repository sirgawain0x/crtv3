import React, { useState } from 'react';
import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Link,
  Text,
  VStack,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useToast,
} from '@chakra-ui/react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ROLES } from '@app/lib/utils/context';
import { useActiveAccount, useActiveWallet, useSendAndConfirmTransaction } from 'thirdweb/react';
import { truncateAddress } from '../../../lib/utils/shortenAddress';
import CustomInput from '../Input/Input';
import { prepareContractCall } from 'thirdweb';
import { client } from '@app/lib/sdk/thirdweb/client';
import { polygon } from 'thirdweb/chains';
import Button from '../Button/Button';
import * as S from '../Content/Content.styled';

const newRules = [
  {
    type: 'ERC721',
    chainId: 137,
    minToken: '1',
    contractAddress: '0xb9c69af58109927cc2dcce8043f82158f7b96ca7',
    roleId: 'contributor',
  },
  {
    type: 'ERC721',
    chainId: 137,
    minToken: '1',
    contractAddress: '0xb6b645c3e2025cf69983983266d16a0aa323e2b0',
    roleId: 'creator',
  },
  {
    type: 'ERC721',
    chainId: 137,
    minToken: '1',
    contractAddress: '0xace23c0669bf52c50d30c33c7e4adc78cc8754ec',
    roleId: 'supporter',
  },
  {
    type: 'ERC721',
    chainId: 137,
    minToken: '1',
    contractAddress: '0x480c5081793506ffb8e4a85390e4ac7c19f2d717',
    roleId: 'brand',
  },
  {
    type: 'ERC721',
    chainId: 137,
    minToken: '1',
    contractAddress: '0xe174caa294999ec622988242641a27c11e6c22d8',
    roleId: 'fan',
  },
];

const RulesValidationSchema = Yup.object().shape({
  type: Yup.string().required('Required'),
  chainId: Yup.number().required('Required'),
  minToken: Yup.string().required('Required'),
  contractAddress: Yup.string().required('Required'),
  roleId: Yup.string().required('Required'),
});

const Member = () => {
  const activeAccount = useActiveAccount();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false)

  const formik = useFormik({
    initialValues: {
      address: activeAccount?.address,
      chainId: newRules[0].chainId,
      type: newRules[0].type,
      contractAddress: newRules[0].contractAddress,
      minToken: newRules[0].minToken,
      roleId: newRules[0].roleId,
    },
    onSubmit: (values) => {
      setIsLoading(true);
      //connectToSDK()
      creatorContract
        .then(() => {
          sendAndConfirmTx(tx)
            .accessControl.checkRoles({
              account: values.address,
              rules: newRules,
            })
            .then((res) => {
              setIsLoading(false);
              setResult(res);
              toast({
                title: 'Role check completed',
                description: 'Your roles have been successfully verified.',
                status: 'success',
                duration: 9000,
                isClosable: true,
              });
            })
            .catch((error) => {
              setIsLoading(false);
              toast({
                title: 'Failed to check roles',
                description: `Error: ${error.message}`,
                status: 'error',
                duration: 9000,
                isClosable: true,
              });
            });
        })
        .catch((error) => {
          setIsLoading(false);
          toast({
            title: 'Failed to connect to SDK',
            description: `Error: ${error.message}`,
            status: 'error',
            duration: 9000,
            isClosable: true,
          });
        });
    },
    validationSchema: RulesValidationSchema,
  });

  return (
    <>
      <Flex
        direction={['column', 'column', 'column', 'row']}
        gap={20}
        className="mx-auto pb-3 pt-24"
        alignItems="flex-start"
        justifyContent="center"
        maxW="1500px"
      >
        <Box my={10} mx={10} alignItems={['center', 'center', 'flex-start']}>
          <S.WebGraphic
            unoptimized
            src="/web_graphic.gif"
            width={450}
            height={550}
            alt="Creative mascot"
          />
        </Box>
        <VStack width="424px" ml="40px">
          <VStack alignItems="flex-start">
            <Text fontSize={'3xl'} fontWeight={'bold'} color={'#EC407A'}>
              Account Connected{' '}
              <span role="img" aria-label="robot-arm">
                🦾
              </span>{' '}
            </Text>
            <Text fontSize="md">
              The form is populated with your account address, and data to check
              the account for{' '}
              <Link href="/pricing" color={'#EC407A'} fontWeight={'bold'}>
                1 Creative Membership Pass
              </Link>{' '}
              on <strong>Polygon</strong>.
              <br />
            </Text>
            <Text fontSize="md" pb="4">
              Keep, or adjust the inputs, then click &apos;
              <strong>Check Role</strong>&apos; to validate your assets and
              obtain access.
            </Text>
          </VStack>

          <form onSubmit={formik.handleSubmit} className="w-full">
            <VStack spacing={4} align="flex-start">
              <FormControl isRequired>
                <FormLabel htmlFor="address" fontSize="sm">
                  Wallet Address
                </FormLabel>
                <CustomInput
                  id="address"
                  name="address"
                  type="string"
                  placeholder="Enter Wallet Address"
                  onChange={formik.handleChange}
                  value={formik.values.address}
                  isDisabled={isLoading}
                  variant="filled"
                  marginBottom={4}
                />
                <FormLabel htmlFor="chainId" fontSize="sm">
                  Chain Id
                </FormLabel>
                <CustomInput
                  id="chainId"
                  name="chainId"
                  type="number"
                  placeholder="Enter Chain ID"
                  onChange={formik.handleChange}
                  value={formik.values.chainId}
                  isDisabled={isLoading}
                  variant="filled"
                  marginBottom={4}
                />
                <FormLabel htmlFor="type" fontSize="sm">
                  Token Type
                </FormLabel>
                <CustomInput
                  id="type"
                  name="type"
                  type="text"
                  placeholder="Enter Token Type"
                  onChange={formik.handleChange}
                  value={formik.values.type}
                  isDisabled={isLoading}
                  variant="filled"
                  marginBottom={4}
                />
                <FormLabel htmlFor="contractAddress" fontSize="sm">
                  Token Contract Address
                </FormLabel>
                <CustomInput
                  id="contractAddress"
                  name="contractAddress"
                  type="address"
                  placeholder="Enter Token Contract Address"
                  onChange={formik.handleChange}
                  value={formik.values.contractAddress}
                  isDisabled={isLoading}
                  variant="filled"
                  marginBottom={4}
                />
                <FormLabel htmlFor="minToken" fontSize="sm">
                  Minimum Tokens in Wallet
                </FormLabel>
                <CustomInput
                  id="minToken"
                  name="minToken"
                  type="string"
                  placeholder="Enter Minimum Tokens in Wallet"
                  onChange={formik.handleChange}
                  value={formik.values.minToken}
                  isDisabled={isLoading}
                  variant="filled"
                  marginBottom={4}
                />
              </FormControl>
              <Button
                type="submit"
                width="fit-content"
                isLoading={isLoading}
                paddingX={10}
              >
                Check Role
              </Button>
            </VStack>
          </form>
          {/* {error && (
            <div className="font-bold text-red-900">Error: {error}</div>
          )} */}
        </VStack>
        <VStack
          align="flex-start"
          alignItems="flex-start"
          width="296px"
          spacing="72px"
          paddingTop="52px"
        >
          <VStack alignItems="flex-start" gap={0} fontSize="md">
            <Link className="underline" href="/pricing">
              <span role={'img'} aria-label={'Membership'}>
                🎫
              </span>{' '}
              Membership Pricing
            </Link>
          </VStack>
          {/* need to check for a listed role */}
          {result && (
            <div>
              <Text
                fontSize="3xl"
                mb={3}
                color={
                  result.roles[0].granted ? 'general.success' : 'general.error'
                }
              >
                Access {result.roles[0].granted ? 'Granted' : 'Denied'}
              </Text>

              <Text>Data sent:</Text>
              <pre
              // style={{
              //   fontFamily: 'mPlus1Code',
              //   fontWeight: '400',
              // }}
              >
                {JSON.stringify(
                  {
                    ...formik.values,
                    address: truncateAddress(formik.values.address!),
                    contractAddress: truncateAddress(
                      formik.values.contractAddress,
                    ),
                  },
                  undefined,
                  4,
                )}
              </pre>
              {result.roles[0].granted ? (
                <Button onClick={onOpen}>Creative TV Menu</Button>
              ) : (
                <Link
                  href="https://app.unlock-protocol.com/checkout?id=1505d0df-b86c-4171-80d5-da502a081db7"
                  target="_blank"
                >
                  <Button my={4}>Purchase A Membership Pass</Button>
                </Link>
              )}
              <Drawer placement={'left'} onClose={onClose} isOpen={isOpen}>
                <DrawerOverlay />
                <DrawerContent>
                  <DrawerHeader borderBottomWidth="1px">
                    Creative TV Menu
                  </DrawerHeader>
                  <DrawerBody>
                    <Link href={`/profile/${activeAccount?.address}`}>
                      My Profile
                    </Link>
                    <p>Upload</p>
                  </DrawerBody>
                </DrawerContent>
              </Drawer>
            </div>
          )}
        </VStack>
      </Flex>
    </>
  );
};

export default Member;
