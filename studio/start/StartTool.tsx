import { HomeIcon } from '@sanity/icons/Home';
import { Card, Container, Flex, Heading, Stack, Text } from '@sanity/ui';
import type { MouseEvent } from 'react';
import { type Tool, useWorkspace } from 'sanity';
import { useRouter } from 'sanity/router';
import { STRUCTURE_TOOL } from '../structure';
import { AFTER_TOURNAMENT_STEPS, START_CHOICES, type StartChoice } from './choices';

/** The Studio's first screen: the coaches' tasks as plain choices, and how to post after a tournament. */
function StartScreen() {
  const router = useRouter();
  const base = useWorkspace().basePath.replace(/\/+$/, '');

  const hrefOf = (choice: StartChoice) => {
    const { create, open } = choice;
    if (create) return router.resolveIntentLink('create', { type: create });
    return `${base}/${STRUCTURE_TOOL}/${encodeURIComponent(open ?? '')}`;
  };

  // Plain links (they also open in a new tab), followed inside the Studio on a normal click.
  const follow = (href: string) => (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.navigateUrl({ path: href });
  };

  return (
    <Card height="fill" overflow="auto">
      <Container width={1} paddingX={4} paddingY={[4, 5]}>
        <Stack gap={5}>
          <Heading as="h1" size={[2, 3]}>
            Ce vrei să faci?
          </Heading>
          <Stack gap={3}>
            {START_CHOICES.map((choice) => {
              const href = hrefOf(choice);
              const Icon = choice.icon;
              return (
                <Card key={choice.title} as="a" href={href} onClick={follow(href)} padding={4} radius={3} border>
                  <Flex align="center" gap={4}>
                    <Text size={4}>
                      <Icon />
                    </Text>
                    <Stack gap={3}>
                      <Text size={[2, 3]} weight="semibold">
                        {choice.title}
                      </Text>
                      <Text size={[1, 2]} muted>
                        {choice.hint}
                      </Text>
                    </Stack>
                  </Flex>
                </Card>
              );
            })}
          </Stack>
          <Stack as="section" gap={4}>
            <Heading as="h2" size={1}>
              Cum postez după un turneu
            </Heading>
            <Stack as="ol" gap={4} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {AFTER_TOURNAMENT_STEPS.map((step, i) => (
                <Flex as="li" key={step} gap={2}>
                  <Text size={[1, 2]} weight="semibold">
                    {i + 1}.
                  </Text>
                  <Text size={[1, 2]}>{step}</Text>
                </Flex>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Card>
  );
}

export const startTool: Tool = {
  name: 'start',
  title: 'Start',
  icon: HomeIcon,
  component: StartScreen,
};
