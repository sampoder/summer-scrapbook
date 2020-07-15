import { useRouter } from 'next/router'
import useSWR from 'swr'
import Head from 'next/head'
import Meta from '@hackclub/meta'
import CalendarHeatmap from '@hackclub/react-calendar-heatmap'
import Icon from '@hackclub/icons'
import Banner from '../../components/banner'
import Message from '../../components/message'
import { StaticMention } from '../../components/mention'
import Post from '../../components/post'
import AudioPlayer from '../../components/audio-player'
import ExamplePosts from '../../components/example-posts'
import FourOhFour from '../404'
import { clamp } from 'lodash'

const HOST =
  process.env.NODE_ENV === 'development' ? '' : 'https://scrapbook.hackclub.com'

const Profile = ({
  profile = {},
  heatmap = [],
  webring = [],
  posts = [],
  children
}) => (
  <main className="container">
    <Meta
      as={Head}
      name="Summer Scrapbook"
      title={`@${profile.username}'s mentions`}
      description={`Follow @${profile.username}’s progress ${
        profile.streakCount > 0
          ? `(currently a ${
              profile.streakCount <= 7 ? profile.streakCount : '7+'
            }-day streak!) `
          : ''
      }making things in the Hack Club community this summer.`}
      image={`https://workshop-cards.hackclub.com/@${
        profile.username
      }.png?brand=Scrapbook${
        profile.avatar ? `&images=${profile.avatar}` : ''
      }&caption=${
        0 < profile.streakCount
          ? profile.streakCount <= 7
            ? profile.streakCount + '-day streak'
            : '7%2b day streak'
          : ''
      }`}
    />
    {children}
    <header>
        {profile.avatar && (
          <div>
            <img
              src={profile.avatar}
              width={96}
              alt={profile.username}
              className="header-title-avatar"
            />
          </div>
        )}
        <div>
        <p>
          <a href = {`/${profile.username}`}><code>@{profile.username}</code></a>'s mentions
        </p>
        </div>
    </header>
    <article className="posts">
      {posts.map(post => (
        <Post key={post.id} user={profile} {...post} />
      ))}
      {posts.length === 1 && <ExamplePosts />}
    </article>
    <style jsx>{`
      header {
        margin:auto;
        text-align:center;
      }
      a {
        text-decoration: none;
      }
      img{
        margin:auto;
      }
      p {
        font-size: 14px;
        color: var(--colors-muted);
      }
      code {
        font-size: 14px;
        color: var(--colors-purple);
      }
      @media (min-width: 32em) {
        h1 {
          font-size: 48px;
        }
        p {
          font-size: 24px;
        }
        header {
          padding: 24px 0 48px;
        }
        code {
          font-size: 24px;
        }
      }
      @media (min-width: 48em) {
        h1 {
          font-size: 64px;
        }
      }
    `}</style>
  </main>
)

const fetcher = url => fetch(url).then(r => r.json())

const Page = ({ username = '', router = {}, initialData = {} }) => {
  const { data, error } = useSWR(`/api/users/${username}`, fetcher, {
    initialData,
    refreshInterval: 5000
  })
  if (!data) {
    return <Message text="Loading…" />
  } else if (error && !data) {
    return <Message text="Error" color1="orange" color2="pink" />
  } else {
    return (
      <Profile
        {...data}
        heatmap={initialData.heatmap}
        webring={initialData.webring}
      >
      </Profile>
    )
  }
}

export default props => {
  const router = useRouter()

  if (router.isFallback) {
    return <Message text="Loading…" />
  } else if (props.profile?.username) {
    return (
      <Page
        username={props.profile.username}
        router={router}
        initialData={props}
      />
    )
  } else {
    return <FourOhFour />
  }
}

export const getStaticPaths = async () => {
  const { map } = require('lodash')
  const usernames = await fetch(
    'https://airbridge.hackclub.com/v0.1/Summer%20of%20Making%20Streaks/Slack%20Accounts' +
      `?select=${JSON.stringify({
        filterByFormula: '{Full Slack Member?} = 1',
        fields: ['Username'],
        sort: [{ field: 'Streak Count', direction: 'desc' }],
        maxRecords: 75
      })}`
  )
    .then(r => r.json())
    .then(u => map(u, 'fields.Username'))
  const paths = usernames.map(username => ({ params: { username } }))
  return { paths, fallback: true }
}

export const getStaticProps = async ({ params }) => {
  const { getProfile, getMentions } = require('../api/users/[username]')
  if (params.username?.length < 2)
    return console.error('No username') || { props: {} }

  const profile = await getProfile(params.username)
  if (!profile || !profile?.username)
    return console.error('No profile') || { props: {} }

  try {
    const posts = await getMentions(profile)
    return {
      props: { profile, posts },
      unstable_revalidate: 1
    }
  } catch (error) {
    console.error(error)
    return { props: { profile }, unstable_revalidate: 1 }
  }
}
