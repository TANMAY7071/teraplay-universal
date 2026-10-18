// use native fetch

const query = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
      userPreferred
    }
    type
    format
    status
    description
    startDate {
      year
      month
      day
    }
    seasonYear
    episodes
    duration
    countryOfOrigin
    trailer {
      id
      site
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    genres
    averageScore
    nextAiringEpisode {
      id
      airingAt
      timeUntilAiring
      episode
    }
    studios {
      nodes {
        id
        name
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          type
          format
          status
          episodes
          coverImage {
            large
          }
        }
      }
    }
    characters(role: MAIN, page: 1, perPage: 25) {
      edges {
        role
        node {
          id
          name {
            userPreferred
          }
          image {
            large
          }
          description
        }
      }
    }
    airingSchedule(page: 1, perPage: 25) {
      nodes {
        id
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
}
`;

fetch("https://graphql.anilist.co", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    query,
    variables: { id: 134088 }
  })
})
.then(res => res.json())
.then(json => {
  console.log(JSON.stringify(json, null, 2));
})
.catch(err => {
  console.error(err);
});
