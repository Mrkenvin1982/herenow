#!/bin/sh

CNAME=herenow.pw

echo "Deleting old publication"
rm -rf public
mkdir public
git worktree prune
rm -rf .git/worktrees/public/

echo "Checking out gh-pages branch into public"
git worktree add -B gh-pages public gh-pages

echo "Removing existing files"
rm -rf public/*

echo "Generating site"
hugo

echo "Writing CNAME ($CNAME)"
echo $CNAME > public/CNAME

echo "Updating gh-pages branch"
cd public && git add --all && git commit -m "Publishing to gh-pages (publish.sh)"

echo "Pushing updates"
git push origin gh-pages
