'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@app/components/ui/input';
import { Textarea } from '@app/components/ui/textarea';
import { Button } from '@app/components/ui/button';
import { Calendar } from '@app/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@app/components/ui/form';
import { Loader2, X } from 'lucide-react';
import snapshot from '@snapshot-labs/snapshot.js';
import { useUser } from '@account-kit/react';
import { useRouter } from 'next/navigation';
import { base } from '@account-kit/infra';
import { ProtectedRoute } from '@app/components/Auth/ProtectedRoute';

const hub = 'https://hub.snapshot.org';
const client = new snapshot.Client(hub);

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  choices: z
    .array(z.string().min(1, 'Choice is required'))
    .min(2, 'At least 2 choices are required'),
  startDate: z.date(),
  endDate: z.date(),
});

/**
 * Renders the Create component.
 *
 * @returns The JSX element representing the Create component.
 */
export default function Create() {
  const router = useRouter();
  const user = useUser();
  const chain = base;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      choices: ['yes', 'no'],
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  const { isSubmitting } = form.formState;

  function onAddChoice() {
    const currentChoices = form.getValues('choices');
    form.setValue('choices', [...currentChoices, '']);
  }

  function onRemoveChoice(index: number) {
    const currentChoices = form.getValues('choices');
    if (currentChoices.length <= 2) return;
    const newChoices = currentChoices.filter((_, i) => i !== index);
    form.setValue('choices', newChoices);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user?.address) return;

    try {
      const provider = await snapshot.utils.getProvider(chain.id.toString());
      const block = await snapshot.utils.getBlockNumber(provider);
      const space = 'thecreative.eth';

      await client.proposal(provider, user.address, {
        space,
        type: 'weighted',
        title: values.title,
        body: values.content,
        choices: values.choices,
        start: Math.floor(values.startDate.getTime() / 1000),
        end: Math.floor(values.endDate.getTime() / 1000),
        snapshot: block,
        discussion: 'max',
        plugins: JSON.stringify({
          poap: {},
        }),
      });

      router.push('/vote');
    } catch (error) {
      console.error(error);
      form.setError('root', {
        message: 'Failed to create proposal. Please try again.',
      });
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                  <CardDescription>
                    Create a new voting proposal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="[#BrandName] Campaign Voting"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your proposal"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Voting Options</CardTitle>
                  <CardDescription>
                    Add choices for your proposal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.watch('choices').map((_, index) => (
                    <FormField
                      key={index}
                      control={form.control}
                      name={`choices.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input placeholder="Enter choice" {...field} />
                              {form.watch('choices').length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRemoveChoice(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onAddChoice}
                  >
                    Add Choice
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                  <CardDescription>Set voting period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() ||
                              date > form.getValues('endDate')
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < form.getValues('startDate')
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Proposal
            </Button>
          </form>
        </Form>
      </div>
    </ProtectedRoute>
  );
}
